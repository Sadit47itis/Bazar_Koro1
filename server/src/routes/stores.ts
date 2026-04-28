import mongoose from 'mongoose';
import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import { Store } from '../models/Store.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';

const storeSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  description: z.string().optional(),
  operatingHours: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.object({
    city: z.string().min(1),
    road: z.string().min(1),
    address: z.string().min(1),
    coordinates: z.tuple([z.number(), z.number()]).optional() // [lng, lat]
  }),
  type: z.enum(['pharmacy', 'general_store'])
});

// ✅ Updated: Zod now accepts stockQuantity and isOutOfStock!
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.coerce.number().min(0),
  category: z.string().optional(),
  stockQuantity: z.coerce.number().min(0).default(0), 
  isOutOfStock: z.boolean().default(false),
  imageUrl: z.string(), // expected to be base64 data url from frontend
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.coerce.number(), z.coerce.number()])
  }).optional()
});

export async function createStoreRoute(req: AuthedRequest, res: Response) {
  if (!req.user || req.user.activeRole !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can create a store' });
  }

  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });

  try {
    const store = new Store({
      ...parsed.data,
      sellerId: req.user.id,
      status: 'pending', // NEW rule: new stores are pending
      isActive: true,
      documents: []
    });
    const saved = await store.save();
    return res.status(201).json(saved);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

export async function getAllStoresRoute(req: AuthedRequest, res: Response) {
  try {
    // Only return approved and active stores for general browse/buyers.
      // Using $nin / $ne ensures older records missing these fields are still shown.
      const stores = await Store.find({ status: { $nin: ['pending', 'rejected'] }, isActive: { $ne: false } }).lean();
      
      const storeIds = stores.map((s: any) => s._id);
      const reviews = await Review.find({ storeId: { $in: storeIds } }).lean();
      
      const storesWithRating = stores.map((s: any) => {
        const storeReviews = reviews.filter((r: any) => r.storeId.toString() === s._id.toString());
        const avgRating = storeReviews.length ? storeReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / storeReviews.length : 0;
        return { ...s, id: s._id, avgRating, reviewCount: storeReviews.length };
      });

    return res.json(storesWithRating);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

export async function getMyStoresRoute(req: AuthedRequest, res: Response) {
  if (!req.user || req.user.activeRole !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can view their stores' });
  }

  try {
    const stores = await Store.find({ sellerId: req.user.id });
    return res.json(stores);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

export async function getStoreWithProductsRoute(req: AuthedRequest, res: Response) {
  try {
    const { storeId } = req.params;
    if (!storeId) return res.status(400).json({ error: 'Missing storeId parameter' });
    if (!mongoose.Types.ObjectId.isValid(storeId)) return res.status(400).json({ error: 'Invalid storeId format' });

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    
    // Security check: If requested as seller, make sure it belongs to them
    if (req.user?.activeRole === 'seller' && store.sellerId !== req.user.id) {
       return res.status(403).json({ error: 'Not your store' });
    }

    const [products, reviews] = await Promise.all([
      Product.find({ storeId: store._id }),
      Review.find({ storeId: store._id }).populate('buyerId', 'name').sort({ createdAt: -1 })
    ]);

    const avgRating = reviews.length > 0
      ? reviews.reduce((acc, r: any) => acc + r.rating, 0) / reviews.length
      : 0;

    return res.json({ store, products, reviews, avgRating });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

export async function uploadStoreDocumentRoute(req: AuthedRequest, res: Response) {
  if (!req.user || req.user.activeRole !== 'seller') return res.status(403).json({ error: 'Only sellers can upload documents' });

  const schema = z.object({ documentUrl: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid document' });

  try {
    const store = await Store.findOne({ _id: req.params.storeId, sellerId: req.user.id });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    store.documents.push(parsed.data.documentUrl);
    await store.save();
    return res.json(store);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

export async function addProductToStoreRoute(req: AuthedRequest, res: Response) {
  if (!req.user || req.user.activeRole !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can add products' });
  }

  // Support both multipart/form-data (where body is parsed but image is in req.file) and application/json
  let fileUrl = req.body.imageUrl;
  if ((req as any).file && (req as any).file.path) {
    fileUrl = (req as any).file.path;
  }

  const payload = { ...req.body, imageUrl: fileUrl };

  // Parse location if it comes from FormData strings like location[type]
  if (payload['location[type]'] && payload['location[coordinates][0]']) {
    payload.location = {
      type: payload['location[type]'],
      coordinates: [
        Number(payload['location[coordinates][0]']),
        Number(payload['location[coordinates][1]'])
      ]
    };
    delete payload['location[type]'];
    delete payload['location[coordinates][0]'];
    delete payload['location[coordinates][1]'];
  }

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product data', details: parsed.error.flatten() });

  try {
    const { storeId } = req.params;
    if (!storeId) return res.status(400).json({ error: 'Missing storeId parameter' });
    if (!mongoose.Types.ObjectId.isValid(storeId)) return res.status(400).json({ error: 'Invalid storeId format' });

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your store' });

    const saved = await Product.create({
      ...parsed.data,
      storeId: store._id
    });
    return res.status(201).json(saved);
  } catch (error: any) {
    console.error('Add product error:', error);
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid product payload', details: error.message });
    }
    return res.status(500).json({ error: 'Server error', details: error?.message ?? 'Unknown error' });
  }
}