import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  marketerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  budget: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  endDate: { type: Date }
}, { timestamps: true });

// We use 'export default' here to match how your Order and Product models work!
export default mongoose.model('Campaign', campaignSchema);