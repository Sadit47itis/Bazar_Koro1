// server/src/routes/search.ts
import { Request, Response } from 'express';
import Product from '../models/Product.js';

export const searchRoute = async (req: Request, res: Response) => {
  try {
    const { keyword, category, minPrice, maxPrice, lat, lng, radius, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const pipeline: any[] = [];

    // 1. GEO-LOCATION MUST BE THE FIRST STAGE IN MONGODB
    if (lat && lng) {
      const radiusInMeters = radius ? parseInt(radius as string, 10) * 1000 : 10000; // Default to 10km
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            // Crucial: MongoDB expects coordinates in [Longitude, Latitude] order
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)] 
          },
          distanceField: 'distance',
          maxDistance: radiusInMeters,
          spherical: true
        }
      });
    }

    // 2. Build the secondary filters ($match)
    const matchStage: any = {};

    if (keyword) {
      matchStage.name = { $regex: keyword as string, $options: 'i' };
    }
    if (category) {
      matchStage.category = category;
    }
    if (minPrice || maxPrice) {
      matchStage.price = {};
      if (minPrice) matchStage.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) matchStage.price.$lte = parseFloat(maxPrice as string);
    }

    // Only push the $match stage if there are actual filters applied
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // ✅ 2.5. ADD PROMOTION STATUS FIELD
    const now = new Date();
    pipeline.push({
      $addFields: {
        isCurrentlyPromoted: {
          $and: [
            { $eq: ['$isPromoted', true] },
            { $gt: ['$promotedUntil', now] }
          ]
        }
      }
    });

    // 3. Calculate Total Documents (for Pagination) before applying skip/limit
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // ✅ 3.5. SORT BY PROMOTION STATUS FIRST (promoted products to the top), then by creation date
    pipeline.push({
      $sort: {
        isCurrentlyPromoted: -1,  // false=0, true=1, so -1 puts true first
        createdAt: -1             // Most recent products next
      }
    });

    // 4. Apply Pagination ($skip and $limit)
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // 5. Execute the final query
    const products = await Product.aggregate(pipeline);

    res.status(200).json({
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });

  } catch (error) {
    console.error('Search Engine Error:', error);
    res.status(500).json({ message: 'Internal server error during search' });
  }
};


export const suggestRoute = async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    
    // If input is empty, return an empty array immediately
    if (!keyword || typeof keyword !== 'string') {
       return res.status(200).json([]);
    }

    // Only search by name, limit to 3, and only return _id and name to save bandwidth
    const suggestions = await Product.find({ name: { $regex: keyword, $options: 'i' } })
      .select('name _id')
      .limit(3)
      .lean();

    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Suggestion Error:', error);
    res.status(500).json({ message: 'Internal server error during suggestions' });
  }
};