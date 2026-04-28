import { Router } from 'express';
import Coupon from '../models/Coupon.js'; 
// 1. Correct the name to match your auth.ts
import { requireAuth } from '../middleware/auth.js'; 

const router = Router();

// 2. Use requireAuth instead of protect
router.post('/validate', requireAuth, async (req: any, res: any) => {
  try {
    const { code, subtotal } = req.body;

    if (!code || !subtotal) {
      return res.status(400).json({ error: "Missing code or subtotal" });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });

    if (!coupon) {
      return res.status(404).json({ error: "Invalid or inactive coupon code." });
    }

    if (new Date() > coupon.expiryDate) {
      return res.status(400).json({ error: "This coupon has expired." });
    }

    if (subtotal < coupon.minPurchase) {
      return res.status(400).json({ 
        error: `Minimum purchase of TK ${coupon.minPurchase} required.` 
      });
    }

    const discountAmount = coupon.discountType === 'percentage' 
      ? (subtotal * coupon.discountValue) / 100 
      : coupon.discountValue;

    return res.json({
      code: coupon.code,
      discountAmount: Math.round(discountAmount)
    });

  } catch (error) {
    console.error("Coupon Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;