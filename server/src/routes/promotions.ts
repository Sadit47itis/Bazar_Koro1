import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import Product from '../models/Product.js';
import { Store } from '../models/Store.js';

// Validation schema for promotion requests
const promoteProductSchema = z.object({
  adBudget: z.number().positive('Ad budget must be greater than 0'),
  durationDays: z.number().int().positive('Duration must be at least 1 day').optional().default(30),
});

/**
 * PROMOTE A PRODUCT
 * Sellers can set an ad budget for their product to make it appear at the top of search results
 * POST /api/products/:productId/promote
 */
export const promoteProductRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can promote products' });
    }

    const { productId } = req.params;
    const parsed = promoteProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { adBudget, durationDays } = parsed.data;

    // Verify product exists and belongs to seller's store
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const store = await Store.findOne({
      _id: product.storeId,
      sellerId: req.user.id
    });
    if (!store) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    // Calculate promotion expiry date
    const promotedUntil = new Date();
    promotedUntil.setDate(promotedUntil.getDate() + durationDays);

    // Update product with ad budget and promotion status
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        adBudget,
        isPromoted: true,
        promotedUntil,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Product promoted for ${durationDays} days with budget ৳${adBudget}`,
      product: updatedProduct,
      promotedUntil,
    });
  } catch (error: any) {
    console.error('Promotion Error:', error);
    res.status(500).json({ error: 'Failed to promote product', details: error.message });
  }
};

/**
 * GET PROMOTION STATUS
 * Check if a product is currently promoted and see its budget/expiry
 * GET /api/products/:productId/ad-status
 */
export const getAdStatusRoute = async (req: AuthedRequest, res: Response) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select('adBudget isPromoted promotedUntil');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const now = new Date();
    const isActive = (product as any).isPromoted && (product as any).promotedUntil > now;
    const promotedUntilDate = (product as any).promotedUntil ? new Date((product as any).promotedUntil) : null;

    res.json({
      productId,
      isPromoted: (product as any).isPromoted,
      isActive,
      adBudget: (product as any).adBudget || 0,
      promotedUntil: (product as any).promotedUntil,
      daysRemaining: isActive && promotedUntilDate
        ? Math.ceil((promotedUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    });
  } catch (error: any) {
    console.error('Ad Status Error:', error);
    res.status(500).json({ error: 'Failed to get ad status' });
  }
};

/**
 * END PROMOTION EARLY
 * Sellers can cancel a promotion before its expiry date
 * DELETE /api/products/:productId/promote
 */
export const cancelPromotionRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can cancel promotions' });
    }

    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const store = await Store.findOne({
      _id: product.storeId,
      sellerId: req.user.id
    });
    if (!store) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        isPromoted: false,
        adBudget: 0,
        promotedUntil: null,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Promotion cancelled',
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Cancel Promotion Error:', error);
    res.status(500).json({ error: 'Failed to cancel promotion' });
  }
};

/**
 * GET ALL PROMOTED PRODUCTS
 * For admin/analytics purposes - see all currently active promotions
 * GET /api/promotions/active
 */
export const getActivePromotionsRoute = async (req: AuthedRequest, res: Response) => {
  try {
    const now = new Date();

    // Find all products with active promotions (isPromoted=true AND promotedUntil > now)
    const promotedProducts = await Product.find({
      isPromoted: true,
      promotedUntil: { $gt: now },
    })
      .select('name price adBudget promotedUntil storeId')
      .populate('storeId', 'name')
      .sort({ promotedUntil: -1 });

    res.json({
      activePromotions: promotedProducts.length,
      products: promotedProducts,
    });
  } catch (error: any) {
    console.error('Active Promotions Error:', error);
    res.status(500).json({ error: 'Failed to fetch active promotions' });
  }
};
