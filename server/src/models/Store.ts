import mongoose from 'mongoose';

export interface IStore {
  name: string;
  ownerName: string;
  location: {
    city: string;
    road: string;
    address: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
  };
  description?: string;
  operatingHours?: string;
  type: 'pharmacy' | 'general_store';
  sellerId: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  documents: string[];
  imageUrl?: string;
}

const storeSchema = new mongoose.Schema<IStore>(
  {
    name: { type: String, required: true },
    ownerName: { type: String, required: true },
    location: {
      city: { type: String, required: true },
      road: { type: String, required: true },
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
      }
    },
    description: { type: String },
    operatingHours: { type: String },
    imageUrl: { type: String },
    type: { type: String, enum: ['pharmacy', 'general_store'], required: true },
    sellerId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    isActive: { type: Boolean, default: true },
    documents: [{ type: String }]
  },
  { timestamps: true }
);

// Create geospatial index for nearby stores
storeSchema.index({ 'location.coordinates': '2dsphere' });

storeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
  }
});

export const Store = mongoose.model<IStore>('Store', storeSchema);