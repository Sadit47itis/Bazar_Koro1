import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js'; 
import Coupon from './models/Coupon.js'; // Import the new model

// Create a fake valid MongoDB ObjectId for the store
const fakeStoreId = new mongoose.Types.ObjectId();

const dummyCoupons = [
  {
    code: "SAVE10",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 500,
    expiryDate: new Date("2026-12-31"),
    isActive: true
  },
  {
    code: "WELCOME50",
    discountType: "fixed",
    discountValue: 50,
    minPurchase: 200,
    expiryDate: new Date("2026-12-31"),
    isActive: true
  },
  {
    code: "EXPIRED20",
    discountType: "percentage",
    discountValue: 20,
    minPurchase: 100,
    expiryDate: new Date("2020-01-01"), // For testing the "expired" error
    isActive: true
  }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is missing in .env");
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');



    // Seed Coupons
    await Coupon.deleteMany({});
    await Coupon.insertMany(dummyCoupons);
    console.log(`🎟️ Successfully injected ${dummyCoupons.length} coupons!`);

    await mongoose.disconnect();
    console.log('👋 Seeding complete. Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();