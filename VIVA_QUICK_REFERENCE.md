# Bazar-Koro: Quick Reference Cheat Sheet

## Quick File Locations

### Feature 1: Search & Filter Engine
**Backend**: `server/src/routes/search.ts` → `searchRoute()`
**Frontend**: `client/src/pages/SearchPage.tsx` + `client/src/components/SearchFilters.tsx`
**Model**: `server/src/models/Product.ts`

### Feature 2: Order Management System (OMS)
**Backend**: `server/src/routes/orders.ts` → `listStoreOrdersRoute()`, `updateOrderStatusRoute()`
**Frontend**: `client/src/components/SellerOMS.tsx`
**Model**: `server/src/models/Order.ts`

### Feature 3: Driver Dashboard & Status
**Backend**: `server/src/routes/driver.ts` → `driverOverviewRoute()`, `setDriverStatusRoute()`, `updateDriverLocationRoute()`
**Frontend**: `client/src/pages/Dashboard.tsx` (driver section)
**Model**: `server/src/models/User.ts`

### Feature 4: Automated Newsletters
**Backend**: `server/src/services/newsletter.ts` → `sendWeeklyNewsletter()`, `sendTestNewsletter()`
**API Routes**: `server/src/routes/newsletter.ts`
**Integration**: SendGrid API

### Feature 5: Delivery Status Updates
**Backend**: `server/src/routes/orders.ts` → `updateOrderStatusRoute()` (driver flow)
**Frontend**: `client/src/pages/Dashboard.tsx` (driver deliveries)
**Validation**: PIN verification + Photo proof

---

## 5-Second Explanations

### Feature 1: Search & Filter
**What**: Buyers search for products with filters (keyword, category, price, distance)
**How**: MongoDB `$geoNear` stage finds products near user, then applies filters
**Key**: Geolocation MUST be first stage in aggregation pipeline

### Feature 2: Order Management System
**What**: Sellers receive orders and can accept/reject/mark as ready
**How**: Sellers see all orders containing their store items
**Key**: Status workflow: placed → accepted → ready_for_pickup → claimed → ... → delivered

### Feature 3: Driver Dashboard
**What**: Drivers toggle online/offline, see available orders, track earnings
**How**: Dashboard shows active deliveries + available orders with distances/fees
**Key**: Auto-refresh every 30 seconds, geolocation watched continuously

### Feature 4: Automated Newsletters
**What**: SendGrid emails top sponsored products to buyers grouped by neighborhood
**How**: Runs weekly, gets all buyers by neighborhood, sends targeted emails
**Key**: Buyers only see deals for their neighborhood

### Feature 5: Delivery Status Updates
**What**: Driver sequentially updates: at_store → picked_up → on_the_way → delivered
**How**: Each status requires driver to verify (online check, assignment check)
**Key**: Final delivery requires PIN (last 4 digits) + optional photo

---

## Code Snippets to Memorize

### GeoNear Query (Feature 1)
```typescript
pipeline.push({
  $geoNear: {
    near: { type: 'Point', coordinates: [lng, lat] },
    distanceField: 'distance',
    maxDistance: radiusInMeters,
    spherical: true
  }
});
```

### Atomic Claim Operation (Feature 2)
```typescript
const claimed = await Order.findOneAndUpdate(
  {
    _id: orderId,
    status: 'ready_for_pickup',
    $or: [{ 'delivery.driverId': null }, { 'delivery.driverId': { $exists: false } }],
  },
  { $set: { status: 'claimed', 'delivery.driverId': driverId } },
  { new: true }
);
// Only one driver can claim
```

### Driver PIN Generation (Feature 2)
```typescript
const pin = Math.floor(1000 + Math.random() * 9000).toString();
// Generates: "1000" to "9999"
```

### Grouped Email Send (Feature 4)
```typescript
const neighborhoodGroups = {};
buyers.forEach(buyer => {
  if (!neighborhoodGroups[buyer.neighborhood]) {
    neighborhoodGroups[buyer.neighborhood] = [];
  }
  neighborhoodGroups[buyer.neighborhood].push(buyer.email);
});

for (const [neighborhood, emails] of Object.entries(neighborhoodGroups)) {
  await sgMail.sendMultiple({ to: emails, ... });
}
```

### Status Flow Check (Feature 5)
```typescript
const allowedByRole = {
  buyer: new Set(['placed']),
  seller: new Set(['accepted', 'rejected', 'ready_for_pickup']),
  driver: new Set(['claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered']),
  admin: new Set([...all]),
};

if (!allowedByRole[role].has(nextStatus)) {
  return res.status(403).json({ error: 'Not allowed' });
}
```

---

## Viva Questions You Might Get

### Q1: How do you prevent 2 drivers from claiming the same order?
**A**: Use atomic `findOneAndUpdate()` operation. MongoDB guarantees only one will succeed. If second tries, query returns null and we show "already claimed" error.

### Q2: Why is $geoNear first in aggregation pipeline?
**A**: MongoDB requires geospatial stages to be first. They build an index scan, then you can filter by other criteria on the result set.

### Q3: How do buyers get neighborhood-specific newsletters?
**A**: We group all buyers by their neighborhood field in MongoDB. Then for each neighborhood, send one email to all emails in that group using SendGrid's `sendMultiple()`.

### Q4: What prevents fake deliveries?
**A**: 
1. PIN verification - driver must enter last 4 digits (given to buyer separately)
2. Photo proof - optional but recommended
3. Only assigned driver can mark as delivered
4. Must go through all status steps (can't jump to delivered)

### Q5: How does geolocation work for drivers?
**A**: 
1. Browser requests permission via `navigator.geolocation`
2. Frontend calls `watchPosition()` when driver is online
3. Continuously sends location to backend
4. Backend stores in MongoDB with timestamp
5. Used to calculate distance to stores for available orders

### Q6: Why use debouncing for search suggestions?
**A**: Without it, API gets called on every keystroke (100+ calls/sec). Debouncing waits 300ms for user to stop typing, then makes ONE API call. Reduces server load, improves performance.

### Q7: How are promoted products shown first in search results?
**A**: After filtering, we sort by `isCurrentlyPromoted: -1` (descending, so true comes first), then by `createdAt: -1`. Ensures promoted products appear at top.

### Q8: What's the delivery fee formula?
**A**: `40 + (distanceKm * 10)` where 40 is base fee, 10 is per-km fee. Example: 5km = 40 + 50 = 90 taka.

### Q9: Why does order model have deliveryPin?
**A**: To verify the right person received the delivery. We generate random 4-digit PIN when order is created. Buyer is told the PIN. Driver must enter matching PIN when marking delivered.

### Q10: How does pagination work?
**A**: `skip = (page - 1) * limit`. For page 3 with limit 10: skip = 20, limit = 10, shows items 20-29. Database returns count too, so we calculate totalPages = Math.ceil(total / limit).

---

## Architecture Overview

```
BUYERS                          SELLERS                    DRIVERS                 ADMINS
  │                              │                           │                       │
  ├─ Search products        ─────┼─ Manage orders       ─────┼─ Claim orders    ─────┼─ Send newsletters
  ├─ Place orders               │   - Accept/reject          │   - Track delivery     │   - Monitor system
  ├─ Track delivery             │   - Mark ready            │   - Update status     │   - Manage data
  └─ Rate sellers              │                           │   - Track earnings     │
                                │                           │                       │
                                    ↓
                            MongoDB Database
                        ┌─────────────────────┐
                        │ Users               │
                        │ Products            │
                        │ Orders              │
                        │ Stores              │
                        │ Reviews             │
                        └─────────────────────┘
                                    │
                        Backend APIs (Express)
                    ┌───────────────────────────┐
                    │ /api/search               │
                    │ /api/orders               │
                    │ /api/driver/              │
                    │ /api/newsletter/          │
                    │ /api/products/            │
                    └───────────────────────────┘
                                    │
                        Frontend (React + TypeScript)
                    ┌───────────────────────────┐
                    │ Dashboard (all roles)     │
                    │ SearchPage                │
                    │ SellerOMS                 │
                    │ Cart & Checkout           │
                    └───────────────────────────┘
```

---

## Key Technologies Used

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Express.js | HTTP server & API routes |
| **Database** | MongoDB | NoSQL database with geospatial queries |
| **Frontend** | React + TypeScript | UI components & state management |
| **Auth** | JWT | Token-based authentication |
| **Validation** | Zod | Runtime type validation |
| **Email** | SendGrid | Transactional & bulk emails |
| **Maps** | Google Maps API | Distance & routing calculations |
| **Geolocation** | Browser Geolocation API | Get user's location |

---

## Common API Calls

### Search Products
```bash
GET /api/search?keyword=milk&category=Groceries&minPrice=50&maxPrice=200&lat=23.8&lng=90.4&radius=5&page=1&limit=10
```

### Create Order
```bash
POST /api/orders
Body: {
  lines: [
    { productId: "...", storeId: "...", name: "Milk", unitPrice: 100, qty: 2 }
  ]
}
```

### Update Order Status (Seller)
```bash
PATCH /api/orders/:id/status
Body: { status: "accepted" }
```

### Update Order Status (Driver - Deliver)
```bash
PATCH /api/orders/:id/status
Body: {
  status: "delivered",
  proof: {
    pinLast4: "4729",
    photoUrl: "https://..."
  }
}
```

### Toggle Driver Online
```bash
POST /api/driver/status
Body: { online: true }
```

### Send Newsletter
```bash
POST /api/newsletter/send
(Admin only, no body needed)
```

---

## Debugging Tips

1. **Search not returning results?**
   - Check if products have category field
   - Check if geolocation coordinates are in [lng, lat] format
   - Check if sponsored product's promotedUntil is in future

2. **Order not showing in seller's OMS?**
   - Verify `lines.storeId` matches seller's store ID
   - Check order status (should be 'placed' or 'paid')

3. **Driver can't claim order?**
   - Verify driver is online (check User.isOnline)
   - Verify order status is 'ready_for_pickup'
   - Verify no other driver claimed it already

4. **Newsletter not sending?**
   - Check SENDGRID_API_KEY is set
   - Verify buyers have neighborhood field set
   - Check sponsored products exist

5. **Delivery PIN not verifying?**
   - Remember: compare pinLast4 (last 4 digits)
   - PIN stored in Order.delivery.deliveryPin
   - Verify driver enters exactly matching 4 digits

---

## Deployment Checklist

- [ ] Set MONGODB_URI environment variable
- [ ] Set SENDGRID_API_KEY environment variable
- [ ] Set GOOGLE_MAPS_API_KEY environment variable
- [ ] Set JWT_SECRET environment variable
- [ ] Run database migrations/seeding
- [ ] Test search with geolocation
- [ ] Test order workflow (buyer → seller → driver)
- [ ] Test newsletter sending
- [ ] Verify PIN verification works
- [ ] Test geolocation tracking on driver

---

## Performance Optimizations Implemented

1. **Database Indexes**
   - 2dsphere index on Product.location (geospatial queries)
   - Text index on Product.name (search)
   - Index on Order.status (filtering)

2. **Caching**
   - Products cached in frontend state
   - Driver overview refreshes every 30 sec (not every keystroke)

3. **Debouncing**
   - Search suggestions debounced 300ms
   - Prevents excessive API calls

4. **Pagination**
   - 10 products per page (not 10,000)
   - Reduces data transfer & rendering

5. **Geolocation**
   - Only tracks when driver is online
   - Stops tracking when offline (saves battery)

---

**Good luck with your viva! Remember to explain the "why" behind each design decision, not just the "what".**
