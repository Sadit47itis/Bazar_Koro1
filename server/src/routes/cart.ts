import type { Response } from 'express'
import { z } from 'zod'

import type { AuthedRequest } from '../middleware/auth.js'
import { Cart } from '../models/Cart.js'
import Product from '../models/Product.js'
import { Store } from '../models/Store.js'

import { calculateDistanceWithGoogle } from '../utils/googleMaps.js'
import { User } from '../models/User.js'

// Delivery fee constants (same as driver.ts)
const DELIVERY_BASE_FEE = 40; // Base delivery fee in Taka
const DELIVERY_PER_KM_FEE = 10; // Per km delivery fee in Taka

const addToCartSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().optional().default(1),
})

const updateQtySchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().nonnegative(),
})

const removeItemSchema = z.object({
  productId: z.string().min(1),
})

function requireBuyer(req: AuthedRequest, res: Response): req is AuthedRequest & { user: NonNullable<AuthedRequest['user']> } {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' })
    return false
  }
  if (req.user.activeRole !== 'buyer') {
    res.status(403).json({ error: 'Only buyers can use cart endpoints' })
    return false
  }
  return true
}

export async function computeSummary(items: any[], buyerId?: string) {
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.qty, 0)
  
  // Delivery charge: base fee + distance-based fee calculated from buyer to store location
  let deliveryCharge = 0;
  let maxDistanceKm = 0;
  if (items.length > 0) {
    deliveryCharge = DELIVERY_BASE_FEE;
    
    if (buyerId) {
      try {
        const buyer = await User.findById(buyerId);
        const buyerLat = buyer?.currentLocation?.coordinates?.[1];
        const buyerLng = buyer?.currentLocation?.coordinates?.[0];
        
        if (buyerLat && buyerLng && (buyerLat !== 0 || buyerLng !== 0)) {
          const storeIds = [...new Set(items.map(i => i.storeId))];
          
          for (const sId of storeIds) {
            const store = await Store.findById(sId);
            const storeLat = (store as any)?.location?.coordinates?.[1];
            const storeLng = (store as any)?.location?.coordinates?.[0];
            
            if (storeLat && storeLng) {
              const res = await calculateDistanceWithGoogle([buyerLat, buyerLng], [storeLat, storeLng]);
              if (res && res.distanceKm > maxDistanceKm) {
                maxDistanceKm = res.distanceKm;
              }
            }
          }
          
          if (maxDistanceKm > 0) {
            deliveryCharge += maxDistanceKm * DELIVERY_PER_KM_FEE;
          }
        }
      } catch (error) {
        console.error('Error calculating delivery distance:', error);
      }
    }
  }

  // Round to nearest integer
  deliveryCharge = Math.round(deliveryCharge);
  const total = subtotal + deliveryCharge

  const groupedByStore = new Map<string, { storeId: string; storeName?: string; items: any[]; subtotal: number }>()
  for (const item of items) {
    const key = item.storeId
    const existing = groupedByStore.get(key)
    if (existing) {
      existing.items.push(item)
      existing.subtotal += item.unitPrice * item.qty
    } else {
      groupedByStore.set(key, {
        storeId: item.storeId,
        storeName: item.storeName,
        items: [item],
        subtotal: item.unitPrice * item.qty,
      })
    }
  }

  return {
    items,
    grouped: [...groupedByStore.values()],
    subtotal,
    deliveryCharge,
    deliveryDistanceKm: parseFloat(maxDistanceKm.toFixed(1)),
    total,
  }
}

export async function addToCartRoute(req: AuthedRequest, res: Response) {
  if (!requireBuyer(req, res)) return

  const parsed = addToCartSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })

  const { productId, qty } = parsed.data

  const product = await Product.findById(productId)
  if (!product) return res.status(404).json({ error: 'Product not found' })

  // ✅ Check if there's enough stock
  if ((product as any).stockQuantity < qty) {
    return res.status(400).json({ error: 'Not enough stock available', available: (product as any).stockQuantity })
  }

  const store = await Store.findById(typeof product.storeId === 'string' ? product.storeId : product.storeId.toString())
  if (!store) return res.status(404).json({ error: 'Store not found for product' })

  const storeId = typeof product.storeId === 'string' ? product.storeId : product.storeId.toString()

  const cart = (await Cart.findOne({ buyerId: req.user.id })) ?? new Cart({ buyerId: req.user.id, items: [] })

  const existingIndex = cart.items.findIndex((i) => i.productId === productId)
  if (existingIndex >= 0) {
    cart.items[existingIndex].qty += qty
    cart.items[existingIndex].unitPrice = product.price
    cart.items[existingIndex].name = product.name
    cart.items[existingIndex].storeId = storeId
    cart.items[existingIndex].storeName = store.name
    cart.items[existingIndex].imageUrl = product.imageUrl
  } else {
    cart.items.push({
      productId,
      storeId,
      storeName: store.name,
      name: product.name,
      unitPrice: product.price,
      qty,
      imageUrl: product.imageUrl,
    })
  }

  // ✅ Decrease product stock by the quantity added to cart
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      $inc: { stockQuantity: -qty },
    },
    { new: true }
  )

  // ✅ Auto-toggle isOutOfStock when stock reaches 0
  if (updatedProduct && (updatedProduct as any).stockQuantity <= 0) {
    await Product.findByIdAndUpdate(productId, { isOutOfStock: true, stockQuantity: 0 })
  }

  await cart.save()
  const summary = await computeSummary(cart.items, req.user.id)
  return res.status(201).json(summary)
}

export async function updateCartItemQtyRoute(req: AuthedRequest, res: Response) {
  if (!requireBuyer(req, res)) return

  const parsed = updateQtySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })

  const { productId, qty } = parsed.data

  const cart = await Cart.findOne({ buyerId: req.user.id })
  if (!cart) return res.json(await computeSummary([], req.user.id))

  const index = cart.items.findIndex((i) => i.productId === productId)
  if (index < 0) return res.status(404).json({ error: 'Cart item not found' })

  const oldQty = cart.items[index].qty
  const qtyDifference = qty - oldQty // Positive if increasing, negative if decreasing

  // ✅ Adjust stock based on quantity change
  if (qtyDifference !== 0) {
    const product = await Product.findById(productId)
    if (product) {
      if (qtyDifference > 0) {
        // Increasing quantity - check if enough stock
        if ((product as any).stockQuantity < qtyDifference) {
          return res.status(400).json({ error: 'Not enough stock available', available: (product as any).stockQuantity })
        }
        // Decrease stock
        await Product.findByIdAndUpdate(productId, { $inc: { stockQuantity: -qtyDifference } })
      } else {
        // Decreasing quantity - restore stock
        await Product.findByIdAndUpdate(productId, {
          $inc: { stockQuantity: -qtyDifference }, // This adds back since qtyDifference is negative
          isOutOfStock: false // Re-enable if it was out of stock
        })
      }
    }
  }

  if (qty === 0) {
    cart.items.splice(index, 1)
  } else {
    cart.items[index].qty = qty
  }

  await cart.save()
  const summary = await computeSummary(cart.items, req.user.id)
  return res.json(summary)
}

export async function removeCartItemRoute(req: AuthedRequest, res: Response) {
  if (!requireBuyer(req, res)) return

  const parsed = removeItemSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })

  const cart = await Cart.findOne({ buyerId: req.user.id })
  if (!cart) return res.json(await computeSummary([], req.user.id))

  const itemToRemove = cart.items.find((i) => i.productId === parsed.data.productId)
  
  // ✅ Restore stock when item is removed from cart
  if (itemToRemove) {
    await Product.findByIdAndUpdate(itemToRemove.productId, {
      $inc: { stockQuantity: itemToRemove.qty }, // Add back the quantity
      isOutOfStock: false // Re-enable if it was out of stock
    })
  }

  cart.items = cart.items.filter((i) => i.productId !== parsed.data.productId)
  await cart.save()
  const summary = await computeSummary(cart.items, req.user.id)
  return res.json(summary)
}

export async function getCartSummaryRoute(req: AuthedRequest, res: Response) {
  if (!requireBuyer(req, res)) return

  const cart = await Cart.findOne({ buyerId: req.user.id })
  const summary = await computeSummary(cart?.items ?? [], req.user.id)
  return res.json(summary)
}
