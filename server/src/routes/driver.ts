import type { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import Order from '../models/Order.js';
import { calculateDistanceWithGoogle } from '../utils/googleMaps.js';

const driverStatusSchema = z.object({
  online: z.boolean(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

const driverGoalSchema = z.object({
  goal: z.number().min(0, "Goal must be a positive number"),
});

// Delivery fee constants
const DELIVERY_BASE_FEE = 40; // Base delivery fee in Taka
const DELIVERY_PER_KM_FEE = 10; // Fee per kilometer in Taka

/**
 * Calculate delivery fee based on distance
 * Formula: baseFee + (distance * perKmFee)
 */
function calculateDeliveryFee(distanceKm: number): number {
  return DELIVERY_BASE_FEE + distanceKm * DELIVERY_PER_KM_FEE;
}
export const driverOverviewRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can access this endpoint' });
    }

    const user = await User.findById(req.user.id).select('isOnline currentLocation driverDailyGoal');
    if (!user) return res.status(404).json({ error: 'Driver not found' });

    const driverObjectId = new mongoose.Types.ObjectId(req.user.id);
    const activeStatuses = ['claimed', 'at_store', 'picked_up', 'on_the_way'];

    const activeDeliveriesList = await Order.find({
      'delivery.driverId': driverObjectId,
      status: { $in: activeStatuses }
    })
      .populate({
        path: 'lines.storeId',
        select: 'location name'
      })
      .sort({ updatedAt: -1 });

    const activeDeliveries = activeDeliveriesList.map(order => {
      const store = (order as any).lines[0]?.storeId;
      return {
        ...order.toObject(),
        storeInfo: store ? {
          id: store._id,
          name: store.name,
          location: store.location,
          road: store.location?.road,
          city: store.location?.city,
          coordinates: store.location?.coordinates,
        } : null,
        dropOffDistanceKm: (order as any).deliveryDistanceKm || 0,
        deliveryFee: (order as any).deliveryFee || 0,
      };
    });

    const completedTrips = await Order.countDocuments({
      'delivery.driverId': driverObjectId,
      status: 'delivered'
    });

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const todaysDeliveries = await Order.find({
      'delivery.driverId': driverObjectId,
      status: 'delivered',
      updatedAt: { $gte: todayStart, $lt: todayEnd }
    })
      .select('-delivery.deliveryPin');

    // Calculate daily earnings based on delivery fee (average of ~70 per delivery)
    // Formula: base fee (40) + average distance (3km) * per-km fee (10) = 70 tk
    const estimatedAverageDeliveryFee = DELIVERY_BASE_FEE + 60; // 40 + (6km * 10)
    const dailyEarnings = todaysDeliveries.length * estimatedAverageDeliveryFee;

    // Get driver's current location (if they set it manually)
    const driverLat = user.currentLocation?.coordinates[1];
    const driverLng = user.currentLocation?.coordinates[0];
    const hasDriverLocation = driverLat && driverLng && (driverLat !== 0 || driverLng !== 0);

    // Fetch available orders with store location
    const availableOrders = await Order.find({
      status: 'ready_for_pickup',
      'delivery.driverId': null
    })
      .populate({
        path: 'lines.storeId',
        select: 'location name'
      })
      .sort({ createdAt: -1 })
      .limit(20);

    // Enrich orders with Google Maps distance and delivery fee
    const enrichedOrders = await Promise.all(
      availableOrders.map(async (order: any) => {
        const store = order.lines[0]?.storeId;
        let distanceKm = 0;
        let estimatedMinutes = 0;

        // Calculate real distance using Google Maps if we have driver location and store coordinates
        if (hasDriverLocation && store?.location?.coordinates?.[0] && store?.location?.coordinates?.[1]) {
          const googleResult = await calculateDistanceWithGoogle(
            [driverLat, driverLng],
            [store.location.coordinates[1], store.location.coordinates[0]]
          );

          if (googleResult) {
            distanceKm = googleResult.distanceKm;
            estimatedMinutes = googleResult.durationMinutes;
          }
        }

        // Calculate delivery fee: base fee + distance-based fee
        const deliveryFee = order.deliveryFee || calculateDeliveryFee(distanceKm);
        const dropOffDistanceKm = order.deliveryDistanceKm || 0;

        return {
          ...order.toObject(),
          storeInfo: store ? {
            id: store._id,
            name: store.name,
            location: store.location,
            road: store.location?.road,
            city: store.location?.city,
            coordinates: store.location?.coordinates,
          } : null,
          distanceKm: parseFloat(distanceKm.toFixed(1)),
          dropOffDistanceKm,
          estimatedMinutes,
          deliveryFee,
          hasDistance: distanceKm > 0,
        };
      })
    );

    return res.json({
      isOnline: !!user.isOnline,
      dailyEarnings,
      completedTrips,
      activeDeliveries,
      availableOrders: enrichedOrders,
      driverHasLocation: hasDriverLocation,
      driverDailyGoal: user.driverDailyGoal || 0,
    });
  } catch (error) {
    console.error('Driver Overview Error:', error);
    return res.status(500).json({ error: 'Failed to load driver overview' });
  }
};

export const setDriverStatusRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update their status' });
    }

    const parsed = driverStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isOnline: parsed.data.online },
      { new: true, runValidators: true }
    ).select('isOnline');

    if (!user) return res.status(404).json({ error: 'Driver not found' });

    return res.json({ isOnline: !!user.isOnline });
  } catch (error) {
    console.error('Set Driver Status Error:', error);
    return res.status(500).json({ error: 'Failed to update driver status' });
  }
};

export const updateDriverLocationRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update their location' });
    }

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid location data', details: parsed.error.flatten() });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [parsed.data.longitude, parsed.data.latitude]
        },
        lastLocationUpdate: new Date()
      },
      { new: true, runValidators: true }
    ).select('currentLocation lastLocationUpdate');

    if (!user) return res.status(404).json({ error: 'Driver not found' });

    return res.json({ 
      success: true, 
      location: user.currentLocation,
      lastUpdate: user.lastLocationUpdate 
    });
  } catch (error) {
    console.error('Update Driver Location Error:', error);
    return res.status(500).json({ error: 'Failed to update driver location' });
  }
};

export const setDriverGoalRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update their goal' });
    }

    const parsed = driverGoalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { driverDailyGoal: parsed.data.goal },
      { new: true, runValidators: true }
    ).select('driverDailyGoal');

    if (!user) return res.status(404).json({ error: 'Driver not found' });

    return res.json({ driverDailyGoal: user.driverDailyGoal });
  } catch (error) {
    console.error('Set Driver Goal Error:', error);
    return res.status(500).json({ error: 'Failed to update driver goal' });
  }
};
