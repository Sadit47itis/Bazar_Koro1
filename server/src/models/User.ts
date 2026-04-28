import mongoose from 'mongoose';
import type { UserRole } from '@bazar-koro/shared';

// We implement mongodb schema design best practices here
// 1. We keep user information and their credentials embedded since it's a 1:1 relationship and small size.
// 2. We use schema validation to ensure roles are correct.

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  roles: UserRole[];
  neighborhood?: string;
  isOnline?: boolean;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  lastLocationUpdate?: Date;
  driverDailyGoal?: number;
  adPoints?: number;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: { 
      type: [String], 
      required: true, 
      enum: ['buyer', 'seller', 'driver', 'marketer', 'admin'],
      default: ['buyer']
    },
    neighborhood: { type: String },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0]
      }
    },
    lastLocationUpdate: { type: Date, default: null },
    driverDailyGoal: { type: Number, default: 0 },
    adPoints: { type: Number, default: 500 },
  },
  { timestamps: true }
);

// Create geospatial index for nearby orders
userSchema.index({ 'currentLocation': '2dsphere' });

// Map the _id to id to match the legacy 'nanoid' structure for the frontend automatically.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
  }
});

export const User = mongoose.model<IUser>('User', userSchema);