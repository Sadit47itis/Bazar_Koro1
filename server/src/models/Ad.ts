import mongoose from 'mongoose';

export interface IAd {
  imageUrl: string;
  status: 'active' | 'inactive' | 'deleted';
  impressions: number;
  clicks: number;  createdAt: Date;
  updatedAt: Date;  marketerId: mongoose.Types.ObjectId;
  totalInvestment: number;
  dailyBid: number;
  durationDays: number;
}

const adSchema = new mongoose.Schema<IAd>(
  {
    imageUrl: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    marketerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalInvestment: { type: Number, required: true },
    dailyBid: { type: Number, required: true },
    durationDays: { type: Number, required: true },
  },
  { timestamps: true }
);

adSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
  },
});

export const Ad = mongoose.model<IAd>('Ad', adSchema);