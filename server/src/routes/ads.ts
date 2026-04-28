import type { Response, Request } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.js';
import { Ad } from '../models/Ad.js';
import { User } from '../models/User.js';

// Get active ad (Public)
export async function getActiveAdRoute(req: Request, res: Response) {
  try {
    const activeAds = await Ad.find({ status: 'active' });
    if (activeAds.length === 0) return res.status(404).json({ error: 'No active ad found' });

    // Only consider ads whose duration hasn't expired
    const now = new Date().getTime();
    const validAds = activeAds.filter(ad => {
      const createdAt = new Date(ad.createdAt as Date).getTime();
      const expiresAt = createdAt + (ad.durationDays * 24 * 60 * 60 * 1000);
      return now < expiresAt;
    });

    if (validAds.length === 0) return res.status(404).json({ error: 'No active ad found' });

    // Weighted shuffle by dailyBid
    let totalWeight = validAds.reduce((sum, ad) => sum + ad.dailyBid, 0);
    let randomValue = Math.random() * totalWeight;

    let selectedAd = validAds[0];
    for (const ad of validAds) {
      if (randomValue < ad.dailyBid) {
        selectedAd = ad;
        break;
      }
      randomValue -= ad.dailyBid;
    }

    return res.json(selectedAd);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

// Track impression (Public)
export async function trackImpressionRoute(req: Request, res: Response) {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } }, { new: true });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

// Track click (Public)
export async function trackClickRoute(req: Request, res: Response) {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

// Upload Ad (Marketer only)
export async function uploadAdRoute(req: AuthedRequest, res: Response) {
  if (!req.user || (req.user.activeRole !== 'marketer' && req.user.activeRole !== 'admin')) {
    return res.status(403).json({ error: 'Only marketers can upload ads' });
  }

  const schema = z.object({
    imageUrl: z.string().url(),
    totalInvestment: z.number().min(1),
    dailyBid: z.number().min(1),
    durationDays: z.number().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const { imageUrl, totalInvestment, dailyBid, durationDays } = parsed.data;

  // Validation: total amount invested must be enough for duration * dailyBid
  if (totalInvestment < dailyBid * durationDays) {
    return res.status(400).json({ error: 'Total investment is less than minimum required (dailyBid * durationDays)' });
  }

  try {
    // Check if user has enough points
    const user = await User.findById(req.user.id);
    if (!user || user.adPoints == null || user.adPoints < totalInvestment) {
      return res.status(400).json({ error: 'Insufficient Ad Points' });
    }

    // Deduct points
    user.adPoints -= totalInvestment;
    await user.save();

    const newAd = new Ad({
      imageUrl,
      status: 'active',
      impressions: 0,
      clicks: 0,
      marketerId: new mongoose.Types.ObjectId(req.user.id),
      totalInvestment,
      dailyBid,
      durationDays,
    });

    await newAd.save();
    return res.status(201).json(newAd);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

// View Ad Analytics (Marketer only)
export async function getAdAnalyticsRoute(req: AuthedRequest, res: Response) {
  if (!req.user || (req.user.activeRole !== 'marketer' && req.user.activeRole !== 'admin')) {
    return res.status(403).json({ error: 'Only marketers or admins can view analytics' });
  }

  try {
    const filter = req.user.activeRole === 'admin' ? {} : { marketerId: req.user.id, status: { $ne: 'deleted' } };
    const ads = await Ad.find(filter).sort({ createdAt: -1 });
    return res.json(ads);
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

// Delete Campaign
export async function deleteAdRoute(req: AuthedRequest, res: Response) {
  if (!req.user || (req.user.activeRole !== 'marketer' && req.user.activeRole !== 'admin')) {
    return res.status(403).json({ error: 'Only marketers or admins can delete ads' });
  }

  try {
    const filter: any = { _id: req.params.id };
    if (req.user.activeRole !== 'admin') {
      filter.marketerId = req.user.id;
    }

    const ad = await Ad.findOneAndUpdate(filter, { status: 'deleted' }, { new: true });
    if (!ad) return res.status(404).json({ error: 'Ad not found or unauthorized' });

    return res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}