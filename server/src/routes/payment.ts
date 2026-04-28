import 'dotenv/config';

import express, { Response, NextFunction } from "express";
import Stripe from "stripe";
import mongoose from "mongoose";
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import Order from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { computeSummary } from './cart.js';
import { sendDigitalReceipt } from '../utils/sendReceipt.js';
import { User } from '../models/User.js';
import { env } from '../env.js';

// --- NEW IMPORTS FOR MARKETER ---
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js'; 
// --------------------------------

const router = express.Router();

// ==========================================
// LAZY INITIALIZE STRIPE (Cached & Safe)
// ==========================================
let stripeInstance: Stripe | null = null;

const getStripe = () => {
  // ✅ FIX 1: Return the existing instance so we don't exhaust network ports
  if (stripeInstance) return stripeInstance;

  // ✅ FIX 2: Add .trim() to strip hidden spaces/newlines from the .env file
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is missing from your .env file!");
  }
  
  stripeInstance = new Stripe(stripeKey, {
    apiVersion: "2026-03-25.dahlia" as any, 
    // ✅ FIX 3: Force Stripe to use the modern Fetch API to prevent Node connection drops
    httpClient: Stripe.createFetchHttpClient(),
  });

  return stripeInstance;
};

// ==========================================
// 1. INITIALIZE CHECKOUT (Before Payment)
// ==========================================
router.post(
  "/create-checkout-session", 
  requireAuth, 
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      if (req.user.activeRole !== 'buyer') {
        return res.status(403).json({ error: 'Only buyers can checkout' });
      }

      const cart = await Cart.findOne({ buyerId: req.user.id });
      if (!cart?.items?.length) {
        return res.status(400).json({ error: 'Your cart is empty' });
      }
      
      const summary = await computeSummary(cart.items, req.user.id);
      const deliveryCharge = summary.deliveryCharge;
      const deliveryDistanceKm = (summary as any).deliveryDistanceKm || 0;

      // EXTRACT COUPON CODE FROM FRONTEND PAYLOAD
      const { affiliateId, couponCode } = req.body; 

      const lineItems = cart.items.map((item: any) => ({
        name: item.name,
        price: item.unitPrice,
        quantity: item.qty,
        storeId: item.storeId,
        productId: item.productId,
      }));

      const totalAmount = lineItems.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      );

      const platformCommission = Math.round(totalAmount * 0.1);
      let marketerCommission = 0;
      
      if (affiliateId) {
        marketerCommission = Math.round(totalAmount * 0.05);
      }

      const sellerAmount = totalAmount - platformCommission - marketerCommission;
      console.log("💰 Payment Breakdown:", { totalAmount, platformCommission, marketerCommission, sellerAmount, deliveryCharge, deliveryDistanceKm });

      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const validMarketerId = affiliateId && mongoose.Types.ObjectId.isValid(affiliateId) 
        ? new mongoose.Types.ObjectId(affiliateId) 
        : undefined;

      const order = await Order.create({
        buyerId: new mongoose.Types.ObjectId(req.user.id),
        lines: cart.items,
        deliveryFee: deliveryCharge,
        deliveryDistanceKm: deliveryDistanceKm,
        status: 'placed',
        delivery: {
          deliveryPin: pin
        },
        marketerId: validMarketerId,
        commissionAmount: marketerCommission
      });

      const stripeLineItems: any[] = lineItems.map((item) => ({
        price_data: {
          currency: "bdt",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      }));

      if (deliveryCharge > 0) {
        stripeLineItems.push({
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Delivery Charge",
              description: "Distance-based dynamic delivery fee",
            },
            unit_amount: Math.round(deliveryCharge * 100), 
          },
          quantity: 1,
        });
      }

      const stripe = getStripe();

      // DYNAMIC SESSION CONFIGURATION
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer_email: req.user.email,
        payment_method_types: ["card"],
        line_items: stripeLineItems,
        mode: "payment",
        invoice_creation: {
          enabled: true,
        },
        success_url: `${env.clientBaseUrl}/success?orderId=${order._id}`,
        cancel_url: `${env.clientBaseUrl}/cancel`,
      };

      // PASS COUPON TO STRIPE (Requires the promo code ID to exist in your Stripe Dashboard)
      if (couponCode) {
        sessionConfig.discounts = [{ coupon: couponCode }];
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return res.json({ url: session.url, orderId: order._id });

    } catch (error: any) {
      console.error("🔥 Stripe Error:", error);
      // STOP HIDING THE ERROR - Send the exact reason to the frontend
      return res.status(500).json({ error: error.message || "An unexpected payment error occurred" });
    }
  }
);

// ==========================================
// 2. CONFIRM SUCCESS (After Payment)
// ==========================================
router.post(
  "/payment-success", 
  requireAuth, 
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      // FIX 2: Added missing authentication guard for TypeScript
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

      const { orderId } = req.body;
      console.log("[payment-success] Called with orderId:", orderId);

      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status === 'paid') {
        return res.json({ success: true, message: "Order already processed" });
      }

      order.status = 'paid';
      await order.save();

      await Cart.findOneAndUpdate(
        { buyerId: req.user.id },
        { $set: { items: [] } }
      );

      const buyer = await User.findById(order.buyerId);
      if (buyer && buyer.email) {
        try {
          const itemsTotal = order.lines.reduce((sum: number, item: any) => sum + item.unitPrice * item.qty, 0);
          const orderDeliveryFee = (order as any).deliveryFee || 0;
          await sendDigitalReceipt(buyer.email, {
            _id: order._id,
            totalAmount: itemsTotal + orderDeliveryFee
          });
        } catch (emailErr) {
          console.error("[payment-success] Error sending receipt email:", emailErr);
        }
      }

      return res.json({ success: true, message: "Payment confirmed, cart emptied, and receipt sent!" });
    } catch (error: any) {
      console.error("[payment-success] Uncaught error:", error);
      return res.status(500).json({ error: error?.message || "Failed to process success" });
    }
  }
);

// ==========================================
// 3. INITIALIZE CAMPAIGN CHECKOUT (MARKETER)
// ==========================================
router.post(
  "/create-campaign-session", 
  requireAuth, 
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      if (req.user.activeRole !== 'marketer') {
        return res.status(403).json({ error: 'Only marketers can run campaigns' });
      }

      const { productId, budget, durationDays } = req.body;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid or missing product ID.' });
      }

      const numericBudget = Number(budget);
      if (isNaN(numericBudget) || numericBudget < 50) {
        return res.status(400).json({ error: 'Budget must be at least 50 BDT' });
      }

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const campaign = await Campaign.create({
        marketerId: new mongoose.Types.ObjectId(req.user.id),
        productId: product._id,
        budget: numericBudget,
        durationDays,
        status: 'pending'
      });

      const stripe = getStripe();

      const session = await stripe.checkout.sessions.create({
        customer_email: req.user.email,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "bdt",
            product_data: {
              name: `Ad Campaign: ${product.name}`,
              description: `Promoting product for ${durationDays} days.`
            },
            unit_amount: Math.round(numericBudget * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${env.clientBaseUrl}/success?campaignId=${campaign._id}`,
        cancel_url: `${env.clientBaseUrl}/cancel`,
      });

      return res.json({ url: session.url });
    } catch (error: any) {
      console.error("Campaign Stripe Error:", error);
      return res.status(500).json({ error: error.message || "Campaign payment failed" });
    }
  }
);

// ==========================================
// 4. CONFIRM CAMPAIGN SUCCESS
// ==========================================
router.post(
  "/campaign-success", 
  requireAuth, 
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      // FIX 3: Added missing authentication guard for TypeScript
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

      const { campaignId } = req.body;
      if (!campaignId) return res.status(400).json({ error: "Campaign ID required" });

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      if (campaign.status === 'active') {
        return res.json({ success: true, message: "Campaign already activated" });
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + campaign.durationDays);

      campaign.status = 'active';
      campaign.endDate = endDate;
      await campaign.save();

      return res.json({ success: true, message: "Campaign successfully launched!" });
    } catch (error: any) {
      console.error("Campaign Success Error:", error);
      return res.status(500).json({ error: error.message || "Failed to confirm campaign" });
    }
  }
);

export default router;