// server/src/models/Order.ts
import mongoose from 'mongoose';

const orderLineSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  qty: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lines: [orderLineSchema],
  
  // --- NEW DISCOUNT FIELDS ---
  pricing: {
    subtotal: { type: Number, required: true }, // Total before discount
    discountAmount: { type: Number, default: 0 }, // Amount subtracted
    couponCode: { type: String, default: null }, // e.g., "LOCAL10"
    total: { type: Number, required: true }      // Final amount paid
  },
  // ---------------------------

  status: {
    type: String,
    enum: ['placed', 'paid', 'accepted', 'rejected', 'ready_for_pickup', 'claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered'],
    default: 'placed'
  },
  marketerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  commissionAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  deliveryDistanceKm: { type: Number, default: 0 },
  delivery: {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryPin: { type: String },
    proof: {
      pinLast4: String,
      photoUrl: String
    }
  }
}, { timestamps: true });

// Helper to calculate total before saving if not provided
// ✅ FIX: Removed 'next' and made the function async
orderSchema.pre('validate', async function() {
  // ✅ FIX: Added a safety check to initialize pricing if it's completely missing
  if (!this.pricing) {
    this.pricing = { subtotal: 0, discountAmount: 0, total: 0, couponCode: null } as any;
  }

  if (this.lines && this.pricing && !this.pricing.subtotal) {
    this.pricing.subtotal = this.lines.reduce((acc, line) => acc + (line.unitPrice * line.qty), 0);
    this.pricing.total = this.pricing.subtotal - (this.pricing.discountAmount || 0);
  }
});

export default mongoose.model('Order', orderSchema);