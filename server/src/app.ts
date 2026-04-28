import 'dotenv/config';
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { healthRoute } from './routes/health.js'
import { addRoleRoute, loginRoute, meRoute, registerRoute, googleLoginRoute } from './routes/auth.js'
import { searchRoute, suggestRoute } from './routes/search.js'
import { getProductRoute, getProductsByStoreRoute, updateProductRoute } from './routes/products.js'
import { requireAuth } from './middleware/auth.js'
import { upload } from './middleware/upload.js'
import { addProductToStoreRoute, createStoreRoute, getMyStoresRoute, getStoreWithProductsRoute, getAllStoresRoute, uploadStoreDocumentRoute } from './routes/stores.js'
import { addToCartRoute, getCartSummaryRoute, removeCartItemRoute, updateCartItemQtyRoute } from './routes/cart.js'
import { 
  createOrderRoute, 
  getOrderRoute, 
  listMyOrdersRoute, 
  listStoreOrdersRoute, 
  updateOrderStatusRoute 
} from './routes/orders.js';
import { driverOverviewRoute, setDriverStatusRoute, updateDriverLocationRoute, setDriverGoalRoute } from './routes/driver.js';
import { getAdminStoresRoute, getAdminStoreRoute, updateStoreStatusRoute, updateStoreActiveRoute, deleteStoreRoute, createAdminRoute } from './routes/admin.js';
import { addReviewRoute, getStoreReviewsRoute, getProductReviewsRoute } from './routes/reviews.js';
import { promoteProductRoute, getAdStatusRoute, cancelPromotionRoute, getActivePromotionsRoute } from './routes/promotions.js';

// Order payments & Ads
import paymentRoutes from './routes/payment.js'
import newsletterRoutes from './routes/newsletter.js'
import { getActiveAdRoute, trackImpressionRoute, trackClickRoute, uploadAdRoute, getAdAnalyticsRoute, deleteAdRoute } from './routes/ads.js';

// Coupons
import couponRoutes from './routes/couponRoutes.js';

export function createApp() {
  const app = express()

  app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-active-role'],
  }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/api/health', healthRoute)
  app.get('/api/search', searchRoute)
  app.get('/api/search/suggest', suggestRoute)
  app.get('/api/products/:id', getProductRoute)
  app.put('/api/products/:id', requireAuth, updateProductRoute as express.RequestHandler)

  app.post('/api/auth/register', registerRoute as express.RequestHandler)
  app.post('/api/auth/login', loginRoute as express.RequestHandler)
  app.post('/api/auth/google', googleLoginRoute as express.RequestHandler)
  app.get('/api/me', requireAuth, meRoute as express.RequestHandler)
  app.post('/api/me/roles', requireAuth, addRoleRoute as express.RequestHandler)

  // Orders
  app.get('/api/orders/me', requireAuth, listMyOrdersRoute);
  app.post('/api/orders', requireAuth, createOrderRoute);
  app.get('/api/orders/:id', requireAuth, getOrderRoute);
  app.patch('/api/orders/:id/status', requireAuth, updateOrderStatusRoute);
  app.get('/api/orders/store/:storeId', requireAuth, listStoreOrdersRoute);

  // Reviews
  app.post('/api/reviews', requireAuth, addReviewRoute as express.RequestHandler);
  app.get('/api/stores/:storeId/reviews', getStoreReviewsRoute as express.RequestHandler);
  app.get('/api/products/:productId/reviews', getProductReviewsRoute as express.RequestHandler);

  // Cart
  app.post('/api/cart/add', requireAuth, addToCartRoute as express.RequestHandler)
  app.post('/api/cart/update-qty', requireAuth, updateCartItemQtyRoute as express.RequestHandler)
  app.post('/api/cart/remove', requireAuth, removeCartItemRoute as express.RequestHandler)
  app.get('/api/cart/summary', requireAuth, getCartSummaryRoute as express.RequestHandler)

  // Payment Router
  app.use('/api/payment', paymentRoutes)

  // Newsletter
  app.use('/api/newsletter', newsletterRoutes)
  // Coupons
  app.use('/api/coupons', couponRoutes);

  // Driver
  app.get('/api/driver/overview', requireAuth, driverOverviewRoute)
  app.post('/api/driver/status', requireAuth, setDriverStatusRoute)
  app.post('/api/driver/location', requireAuth, updateDriverLocationRoute)
  app.post('/api/driver/goal', requireAuth, setDriverGoalRoute)

  // Stores and Products
  app.get('/api/stores/all', requireAuth, getAllStoresRoute as express.RequestHandler)
  app.post('/api/stores', requireAuth, createStoreRoute as express.RequestHandler)
  app.get('/api/stores', requireAuth, getMyStoresRoute as express.RequestHandler)
  app.get('/api/stores/:storeId', requireAuth, getStoreWithProductsRoute as express.RequestHandler)
  app.post('/api/stores/:storeId/products', requireAuth, upload.single('image'), addProductToStoreRoute as express.RequestHandler)
  app.post('/api/stores/:storeId/documents', requireAuth, uploadStoreDocumentRoute as express.RequestHandler)
  app.get('/api/products/store/:storeId', requireAuth, getProductsByStoreRoute as express.RequestHandler)

  // Promotions (Module 4)
  app.post('/api/products/:productId/promote', requireAuth, promoteProductRoute as express.RequestHandler)
  app.get('/api/products/:productId/ad-status', requireAuth, getAdStatusRoute as express.RequestHandler)
  app.delete('/api/products/:productId/promote', requireAuth, cancelPromotionRoute as express.RequestHandler)
  app.get('/api/promotions/active', requireAuth, getActivePromotionsRoute as express.RequestHandler)

  // Admin
  app.get('/api/admin/stores', requireAuth, getAdminStoresRoute as express.RequestHandler)
  app.get('/api/admin/stores/:id', requireAuth, getAdminStoreRoute as express.RequestHandler)
  app.patch('/api/admin/stores/:id/status', requireAuth, updateStoreStatusRoute as express.RequestHandler)
  app.patch('/api/admin/stores/:id/active', requireAuth, updateStoreActiveRoute as express.RequestHandler)
  app.delete('/api/admin/stores/:id', requireAuth, deleteStoreRoute as express.RequestHandler)
  app.post('/api/admin/admins', requireAuth, createAdminRoute as express.RequestHandler)

  // Ads
  app.get('/api/ads/active', getActiveAdRoute as express.RequestHandler)
  app.post('/api/ads/:id/impression', trackImpressionRoute as express.RequestHandler)
  app.post('/api/ads/:id/click', trackClickRoute as express.RequestHandler)
  app.post('/api/ads', requireAuth, uploadAdRoute as express.RequestHandler)
  app.get('/api/ads/analytics', requireAuth, getAdAnalyticsRoute as express.RequestHandler)
  app.delete('/api/ads/:id', requireAuth, deleteAdRoute as express.RequestHandler)

  // In production, serve the built React app from client/dist.
  // Compiled file lives at server/dist/app.js, so client/dist is two levels up.
  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const clientDist = path.resolve(__dirname, '../../client/dist')

    app.use(express.static(clientDist))

    // SPA fallback: any non-API GET request returns index.html so client-side
    // routing (react-router) works on direct URL hits and refreshes.
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next()
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  return app
}