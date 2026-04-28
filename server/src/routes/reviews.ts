import type { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import { Store } from '../models/Store.js';
import Product from '../models/Product.js';

const reviewSchema = z.object({
  orderId: z.string().min(1),
  storeId: z.string().min(1),
  productId: z.string().optional(), // if provided, it's a product review. if not, store review.
  rating: z.number().min(1).max(5),
  comment: z.string().min(1)
});

export const addReviewRoute = async (req: AuthedRequest, res: Response) => {
  if (!req.user || req.user.activeRole !== 'buyer') {
    return res.status(403).json({ error: 'Only buyers can review' });
  }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });

  try {
    const { orderId, storeId, productId, rating, comment } = parsed.data;

    // Verify order belongs to buyer and is delivered
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) return res.status(403).json({ error: 'Not your order' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'You can only review delivered orders' });

    // Check if they already reviewed this item/store from this order
    const existing = await Review.findOne({ orderId, storeId, productId: productId || null });
    if (existing) return res.status(400).json({ error: 'You already reviewed this item for this order' });

    const review = await Review.create({
      buyerId: req.user.id,
      storeId,
      productId: productId || undefined,
      orderId,
      rating,
      comment
    });

    res.status(201).json(review);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const getStoreReviewsRoute = async (req: AuthedRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    
    // Find reviews for this store that DO NOT have a productId set
    // In Mongoose, this means productId is undefined, null, or missing.
    const reviews = await Review.find({ storeId: storeObjId, productId: null })
      .populate('buyerId', 'name') // get buyer name
      .sort({ createdAt: -1 });
    
    // Total count for store (including product reviews)
    const total = await Review.countDocuments({ storeId: storeObjId });
    const agg = await Review.aggregate([
      { $match: { storeId: storeObjId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    res.json({ reviews, count: total, avgRating: agg.length ? agg[0].avgRating : 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}

export const getProductReviewsRoute = async (req: AuthedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId })
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ productId });
    const agg = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    res.json({ reviews, count: total, avgRating: agg.length ? agg[0].avgRating : 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}