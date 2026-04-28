import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';

const router = Router();

// Get products available for promotion
router.get('/products', requireAuth, requireRole('marketer'), async (req: any, res: any) => {
  try {
    const products = await Product.find().limit(20); // Marketers can pick from any product
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create a Campaign (This would usually be called after Stripe payment success)
router.post('/create', requireAuth, requireRole('marketer'), async (req: any, res: any) => {
  try {
    const { productId, budget, days } = req.body;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const campaign = await Campaign.create({
      marketerId: req.user.id,
      productId,
      budget,
      endDate
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

export default router;