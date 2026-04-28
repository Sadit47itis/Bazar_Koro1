# Bazar-Koro: Detailed Feature Flow Diagrams

## Feature 1: Search & Filter Engine - Complete Flow

```
═══════════════════════════════════════════════════════════════════════════════════

STEP 1: BUYER INITIATES SEARCH
┌──────────────────────────────────────────────────────────────────────────────┐
│ Frontend: SearchPage.tsx                                                      │
│                                                                               │
│ User Input:                                                                  │
│  ├─ Keyword: "milk"                                                         │
│  ├─ Category: "Groceries"                                                   │
│  ├─ Price Range: 50-200                                                     │
│  ├─ Distance: 5 km                                                          │
│  └─ Location: Geolocation (Latitude: 23.8, Longitude: 90.4)               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 2: TRIGGER SEARCH (useSearch Hook)
┌──────────────────────────────────────────────────────────────────────────────┐
│ Build Query String:                                                          │
│                                                                               │
│ /api/search?                                                                 │
│   keyword=milk                                                               │
│   &category=Groceries                                                        │
│   &minPrice=50                                                               │
│   &maxPrice=200                                                              │
│   &lat=23.8                                                                  │
│   &lng=90.4                                                                  │
│   &radius=5                                                                  │
│   &page=1                                                                    │
│   &limit=10                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 3: BACKEND RECEIVES REQUEST
┌──────────────────────────────────────────────────────────────────────────────┐
│ searchRoute() in server/src/routes/search.ts                                 │
│                                                                               │
│ Extract Parameters:                                                          │
│   keyword = "milk"                                                           │
│   category = "Groceries"                                                     │
│   minPrice = 50, maxPrice = 200                                             │
│   lat = 23.8, lng = 90.4                                                    │
│   radius = 5 km → 5000 meters                                               │
│   pageNum = 1, limitNum = 10                                                │
│   skip = (1-1) * 10 = 0                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 4: BUILD MONGODB AGGREGATION PIPELINE
┌──────────────────────────────────────────────────────────────────────────────┐
│ MongoDB Aggregation Pipeline                                                  │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STAGE 1: $geoNear (MUST BE FIRST!)                                     │ │
│ │ ────────────────────────────────────                                   │ │
│ │ {                                                                       │ │
│ │   $geoNear: {                                                           │ │
│ │     near: {                                                             │ │
│ │       type: 'Point',                                                    │ │
│ │       coordinates: [90.4, 23.8]  ← [LONGITUDE, LATITUDE]              │ │
│ │     },                                                                  │ │
│ │     distanceField: 'distance',                                          │ │
│ │     maxDistance: 5000,  ← meters                                        │ │
│ │     spherical: true                                                     │ │
│ │   }                                                                      │ │
│ │ }                                                                        │ │
│ │                                                                         │ │
│ │ OUTPUT: All products within 5km, with 'distance' field added           │ │
│ │ ┌────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Product 1: {"_id": "123", "name": "Milk", "distance": 1200m}   │    │ │
│ │ │ Product 2: {"_id": "124", "name": "Milk Powder", "distance": 2300m}│ │
│ │ │ Product 3: {"_id": "125", "name": "Yogurt", "distance": 3100m}│    │ │
│ │ │ ... (only within 5km)                                          │    │ │
│ │ └────────────────────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STAGE 2: $match (Filter by keyword, category, price)                   │ │
│ │ ───────────────────────────────────────────────────────                │ │
│ │ {                                                                       │ │
│ │   $match: {                                                             │ │
│ │     name: { $regex: 'milk', $options: 'i' },  ← case-insensitive      │ │
│ │     category: 'Groceries',                                             │ │
│ │     price: { $gte: 50, $lte: 200 }                                     │ │
│ │   }                                                                      │ │
│ │ }                                                                        │ │
│ │                                                                         │ │
│ │ OUTPUT: Only products matching ALL filters                             │ │
│ │ ┌────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Product 1: Milk (150 taka) ✓ matches all filters               │    │ │
│ │ │ Product 2: Milk Powder (180 taka) ✓ matches all filters        │    │ │
│ │ │ (Product 3: Yogurt ✗ - doesn't match keyword 'milk')           │    │ │
│ │ └────────────────────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STAGE 3: $addFields (Calculate promotion status)                       │ │
│ │ ──────────────────────────────────────────────────────────              │ │
│ │ For each product, add:                                                  │ │
│ │   isCurrentlyPromoted = (isPromoted === true AND                        │ │
│ │                          promotedUntil > NOW)                           │ │
│ │                                                                         │ │
│ │ ┌────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Product 1: {"name": "Milk", "isCurrentlyPromoted": true}       │    │ │
│ │ │ Product 2: {"name": "Milk Powder", "isCurrentlyPromoted": false}│   │ │
│ │ └────────────────────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STAGE 4: $sort (Promoted first, then by creation date)                 │ │
│ │ ──────────────────────────────────────────────────────────              │ │
│ │ {                                                                       │ │
│ │   $sort: {                                                              │ │
│ │     isCurrentlyPromoted: -1,   ← true (1) before false (0)             │ │
│ │     createdAt: -1              ← newest first                           │ │
│ │   }                                                                      │ │
│ │ }                                                                        │ │
│ │                                                                         │ │
│ │ OUTPUT: Sorted by promotion status, then by date                       │ │
│ │ ┌────────────────────────────────────────────────────────────────┐    │ │
│ │ │ 1. Product 1: Milk (PROMOTED) - date: 2026-04-01  ← TOP!      │    │ │
│ │ │ 2. Product 2: Milk Powder (not promoted) - date: 2026-03-20  │    │ │
│ │ └────────────────────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ STAGE 5: $skip & $limit (Pagination)                                   │ │
│ │ ──────────────────────────────────────────────────────────              │ │
│ │ $skip: 0     ← skip first 0 products                                    │ │
│ │ $limit: 10   ← return next 10 products                                  │ │
│ │                                                                         │ │
│ │ For page 2 with limit 10: skip = 10 (skip first 10, show 11-20)        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 5: ALSO COUNT TOTAL DOCUMENTS
┌──────────────────────────────────────────────────────────────────────────────┐
│ Run pipeline again with $count stage                                         │
│                                                                               │
│ Stages 1-3 (filter), then $count                                             │
│                                                                               │
│ Result: { total: 45 }  ← Total products matching filters (ignoring pagination)
│                                                                               │
│ This is used to calculate: totalPages = Math.ceil(45 / 10) = 5 pages        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 6: RETURN RESULTS TO FRONTEND
┌──────────────────────────────────────────────────────────────────────────────┐
│ Response JSON:                                                               │
│ {                                                                            │
│   "products": [                                                              │
│     {                                                                        │
│       "_id": "123",                                                          │
│       "name": "Milk",                                                        │
│       "price": 150,                                                          │
│       "category": "Groceries",                                               │
│       "distance": 1200,  ← in meters                                        │
│       "imageUrl": "https://...",                                             │
│       "isCurrentlyPromoted": true,                                           │
│       "storeInfo": { "name": "Store A", "location": {...} }                 │
│     },                                                                       │
│     {                                                                        │
│       "_id": "124",                                                          │
│       "name": "Milk Powder",                                                 │
│       "price": 180,                                                          │
│       "distance": 2300,                                                      │
│       "isCurrentlyPromoted": false                                           │
│     }                                                                        │
│   ],                                                                         │
│   "total": 45,          ← Total matching products (before pagination)        │
│   "page": 1,            ← Current page                                       │
│   "totalPages": 5       ← Total pages needed                                 │
│ }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 7: FRONTEND DISPLAYS RESULTS
┌──────────────────────────────────────────────────────────────────────────────┐
│ SearchPage.tsx                                                               │
│                                                                               │
│ ┌─ Product Card 1 ──────────────────────────────────┐                       │
│ │ [Image of Milk]                                   │                       │
│ │ Milk (PROMOTED)                     Distance: 1.2km│                      │
│ │ Price: ৳150                                       │                       │
│ │ Store: Store A                                    │                       │
│ │ [Add to Cart]                                     │                       │
│ └────────────────────────────────────────────────────┘                       │
│                                                                               │
│ ┌─ Product Card 2 ──────────────────────────────────┐                       │
│ │ [Image of Milk Powder]                            │                       │
│ │ Milk Powder                         Distance: 2.3km│                       │
│ │ Price: ৳180                                       │                       │
│ │ Store: Store B                                    │                       │
│ │ [Add to Cart]                                     │                       │
│ └────────────────────────────────────────────────────┘                       │
│                                                                               │
│ Pagination: [1] [2] [3] [4] [5]                                              │
│ Showing 1-2 of 45 results                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
```

---

## Feature 2: Order Management System - Complete Workflow

```
═══════════════════════════════════════════════════════════════════════════════════

BUYER CREATES ORDER
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Buyer adds items to cart                                                  │
│    Cart: [Milk × 2, Eggs × 1]                                               │
│                                                                               │
│ 2. Buyer clicks "Checkout"                                                   │
│    POST /api/orders                                                          │
│    Body: {                                                                   │
│      lines: [                                                                │
│        { productId: "P1", storeId: "S1", name: "Milk", unitPrice: 150, qty: 2 },
│        { productId: "P2", storeId: "S1", name: "Eggs", unitPrice: 100, qty: 1 }│
│      ]                                                                       │
│    }                                                                         │
│                                                                               │
│ 3. Backend creates order:                                                    │
│    ├─ buyerId = current user                                                │
│    ├─ Generate PIN: "4729" (random 1000-9999)                              │
│    ├─ status = 'placed'                                                      │
│    └─ Save to MongoDB                                                        │
│                                                                               │
│ Order in DB:                                                                 │
│ {                                                                            │
│   "_id": "ORDER123",                                                         │
│   "buyerId": "BUYER456",                                                     │
│   "lines": [                                                                 │
│     { productId: "P1", storeId: "S1", name: "Milk", unitPrice: 150, qty: 2 },│
│     { productId: "P2", storeId: "S1", name: "Eggs", unitPrice: 100, qty: 1 } │
│   ],                                                                         │
│   "status": "placed",                                                        │
│   "delivery": {                                                              │
│     "deliveryPin": "4729",  ← Secret PIN for delivery                       │
│     "driverId": null        ← No driver assigned yet                        │
│   },                                                                         │
│   "createdAt": "2026-04-28T10:00:00Z"                                        │
│ }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

SELLER RECEIVES ORDER (in SellerOMS)
┌──────────────────────────────────────────────────────────────────────────────┐
│ Seller Dashboard (SellerOMS.tsx)                                             │
│                                                                               │
│ Query: GET /api/orders/store/S1                                             │
│   ↓                                                                          │
│ Backend finds: Order.find({ 'lines.storeId': 'S1' })                        │
│   ↓                                                                          │
│ Result: Shows all orders containing items from Store S1                      │
│                                                                               │
│ Display in UI:                                                               │
│ ┌───────────────────────────────────────────────────────────────┐            │
│ │ Order #123ABC                                   STATUS: placed│            │
│ │ ─────────────────────────────────────────────────────────────│            │
│ │ Items:                                                        │            │
│ │   2x Milk ..................... ৳300                          │            │
│ │   1x Eggs ..................... ৳100                          │            │
│ │   ─────────────────────────────────────                       │            │
│ │   Total ...................... ৳400                          │            │
│ │                                                               │            │
│ │ [Accept] [Reject]                                             │            │
│ └───────────────────────────────────────────────────────────────┘            │
│                                                                               │
│ Seller reviews order and clicks "Accept"                                     │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: { status: "accepted" }                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

SELLER ACCEPTS & PREPARES
┌──────────────────────────────────────────────────────────────────────────────┐
│ Order Status Updated:                                                        │
│ "placed" → "accepted"                                                        │
│                                                                               │
│ Seller now prepares items:                                                   │
│   ✓ Gets 2L Milk bottles                                                     │
│   ✓ Gets 1 tray of eggs                                                      │
│   ✓ Packs items                                                              │
│                                                                               │
│ Once ready, seller clicks "Mark Ready for Pickup"                            │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: { status: "ready_for_pickup" }                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

DRIVER SEES AVAILABLE ORDERS
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver Dashboard                                                             │
│                                                                               │
│ Backend: GET /api/driver/overview                                           │
│ Query: Order.find({ status: 'ready_for_pickup', 'delivery.driverId': null })│
│                                                                               │
│ Available Orders Shown to Driver:                                            │
│ ┌──────────────────────────────────────────────────────────────┐             │
│ │ Order #123ABC                                               │             │
│ │ Store: Fresh Foods                                          │             │
│ │ Items: 2x Milk, 1x Eggs                                     │             │
│ │ Distance: 1.5 km                                            │             │
│ │ Est. Time: 5 minutes                                        │             │
│ │ Delivery Fee: ৳65                                            │             │
│ │ [CLAIM ORDER]                                                │             │
│ └──────────────────────────────────────────────────────────────┘             │
│                                                                               │
│ Driver clicks "CLAIM ORDER"                                                  │
│ POST /api/orders/ORDER123/status                                            │
│ Body: { status: "claimed" }                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

ATOMIC CLAIM OPERATION (Prevents Race Condition)
┌──────────────────────────────────────────────────────────────────────────────┐
│ Backend executes ATOMIC operation:                                           │
│                                                                               │
│ await Order.findOneAndUpdate(                                                │
│   {                                                                          │
│     _id: "ORDER123",                                                         │
│     status: "ready_for_pickup",                                             │
│     'delivery.driverId': null  ← Must be unclaimed                          │
│   },                                                                         │
│   {                                                                          │
│     $set: {                                                                  │
│       status: "claimed",                                                     │
│       'delivery.driverId': "DRIVER789"                                       │
│     }                                                                        │
│   },                                                                         │
│   { new: true }                                                              │
│ )                                                                            │
│                                                                               │
│ MongoDB Guarantees:                                                          │
│ • If Driver A and Driver B click simultaneously                              │
│ • Only ONE succeeds (atomic operation)                                       │
│ • Other gets: "This order has already been claimed by another driver"       │
│ • No duplicate deliveries possible                                           │
│                                                                               │
│ Order Now:                                                                   │
│ {                                                                            │
│   ...order data...,                                                          │
│   status: "claimed",                                                         │
│   delivery: {                                                                │
│     driverId: "DRIVER789",  ← Assigned to this driver                       │
│     deliveryPin: "4729"     ← Secret PIN for delivery                       │
│   }                                                                          │
│ }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

ORDER STATUS FLOW (Features 2 & 5 Combined)
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SELLER WORKFLOW                                      │
│                    ┌─────────────────────┐                                   │
│                    │ 1. placed (order    │                                   │
│                    │    created by buyer)│                                   │
│                    └──────────┬──────────┘                                   │
│                               │ Seller accepts                               │
│                    ┌──────────▼──────────┐                                   │
│                    │ 2. accepted (seller │                                   │
│                    │    accepts order)   │                                   │
│                    └──────────┬──────────┘                                   │
│                               │ Seller prepares items                        │
│                    ┌──────────▼──────────────┐                               │
│                    │ 3. ready_for_pickup    │                               │
│                    │    (seller marks ready)│                               │
│                    └──────────┬──────────────┘                               │
│                               │                                              │
│                         DRIVER WORKFLOW                                      │
│                    ┌──────────▼──────────────┐                               │
│                    │ 4. claimed (driver     │                               │
│                    │    claims order)       │                               │
│                    └──────────┬──────────────┘                               │
│                               │ Driver goes to store                         │
│                    ┌──────────▼──────────────┐                               │
│                    │ 5. at_store (driver    │                               │
│                    │    at store location)  │                               │
│                    └──────────┬──────────────┘                               │
│                               │ Driver collects items                        │
│                    ┌──────────▼──────────────┐                               │
│                    │ 6. picked_up (driver   │                               │
│                    │    has items)          │                               │
│                    └──────────┬──────────────┘                               │
│                               │ Driver drives to buyer                       │
│                    ┌──────────▼──────────────┐                               │
│                    │ 7. on_the_way (driver  │                               │
│                    │    en route to buyer)  │                               │
│                    └──────────┬──────────────┘                               │
│                               │ Driver at buyer location                     │
│                    ┌──────────▼──────────────┐                               │
│                    │ 8. delivered (driver   │                               │
│                    │    handed to buyer,    │                               │
│                    │    PIN verified)       │                               │
│                    └──────────────────────────┘                               │
│                               │                                              │
│                          ORDER COMPLETE ✓                                    │
│                    ├─ Payment finalized                                      │
│                    ├─ Driver earnings credited                              │
│                    └─ Buyer can review seller                               │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
```

---

## Feature 3: Driver Dashboard - Real-Time Data Flow

```
═══════════════════════════════════════════════════════════════════════════════════

DRIVER LOGS IN & GOES TO DASHBOARD
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dashboard.tsx detects selectedRole === 'driver'                              │
│                                                                               │
│ Triggers useEffect:                                                          │
│   ├─ Fetch /api/driver/overview (initial load)                             │
│   ├─ Request browser geolocation permission                                 │
│   ├─ Call getCurrentPosition() once                                          │
│   └─ Call watchPosition() to track location continuously                     │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

GEOLOCATION TRACKING STARTS
┌──────────────────────────────────────────────────────────────────────────────┐
│ Browser asks: "Can Bazar-Koro access your location?"                        │
│                                                                               │
│ Driver clicks: "Allow"                                                       │
│                                                                               │
│ Browser provides:                                                            │
│   latitude: 23.8010                                                          │
│   longitude: 90.3535                                                         │
│   accuracy: 10 meters                                                        │
│   timestamp: 2026-04-28T10:05:32Z                                            │
│                                                                               │
│ Frontend calls: updateDriverLocation(23.8010, 90.3535)                      │
│                                                                               │
│ Backend receives:                                                            │
│   POST /api/driver/location                                                  │
│   Body: { latitude: 23.8010, longitude: 90.3535 }                           │
│                                                                               │
│ Backend stores in MongoDB:                                                   │
│   User Document:                                                             │
│   {                                                                          │
│     _id: "DRIVER789",                                                        │
│     name: "Ahmed",                                                           │
│     currentLocation: {                                                       │
│       type: 'Point',                                                         │
│       coordinates: [90.3535, 23.8010]  ← [LONGITUDE, LATITUDE]             │
│     },                                                                       │
│     lastLocationUpdate: 2026-04-28T10:05:32Z,                               │
│     isOnline: true                                                           │
│   }                                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

DRIVER DASHBOARD DISPLAYED
┌──────────────────────────────────────────────────────────────────────────────┐
│ GET /api/driver/overview response contains:                                  │
│                                                                               │
│ ┌─ Driver Status ────────────────────────────────────────────────────────┐  │
│ │ Status: ⚫ ONLINE (Toggle button)                                      │  │
│ │                                                                        │  │
│ │ Today's Earnings: ৳280 (3 deliveries × ~70 taka avg)                 │  │
│ │ Completed Trips: 3                                                    │  │
│ │ Daily Goal: ৳500 (56% complete)                                      │  │
│ │                                                                        │  │
│ │ [Progress Bar: ████░░░░░░]                                            │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│ ┌─ Active Deliveries ────────────────────────────────────────────────────┐  │
│ │ Currently delivering: 1                                               │  │
│ │                                                                        │  │
│ │ Order #123ABC                                                         │  │
│ │ Status: on_the_way                                                    │  │
│ │ Items: 2x Milk, 1x Eggs                                               │  │
│ │ Store: Fresh Foods                                                    │  │
│ │ Delivery Fee: ৳65                                                      │  │
│ │ [Deliver & Verify PIN]                                                 │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│ ┌─ Available Orders to Claim ────────────────────────────────────────────┐  │
│ │ 5 orders nearby                                                       │  │
│ │                                                                        │  │
│ │ Order #456DEF                                                         │  │
│ │ Store: Green Grocery                                                  │  │
│ │ Items: 3x Banana, 2x Apple                                            │  │
│ │ Distance: 2.1 km                                                      │  │
│ │ Est. Time: 8 minutes                                                  │  │
│ │ Delivery Fee: ৳71                                                      │  │
│ │ [CLAIM ORDER]                                                          │  │
│ │                                                                        │  │
│ │ Order #789GHI                                                         │  │
│ │ Store: Daily Market                                                   │  │
│ │ Items: 1x Rice 10kg                                                   │  │
│ │ Distance: 3.5 km                                                      │  │
│ │ Est. Time: 12 minutes                                                 │  │
│ │ Delivery Fee: ৳75                                                      │  │
│ │ [CLAIM ORDER]                                                          │  │
│ │ ... (more orders)                                                      │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

AUTO-REFRESH EVERY 30 SECONDS
┌──────────────────────────────────────────────────────────────────────────────┐
│ JavaScript Interval:                                                         │
│                                                                               │
│ setInterval(() => {                                                          │
│   fetch('/api/driver/overview')                                             │
│     .then(data => setDriverOverview(data))  // Update UI                     │
│ }, 30000);  // Every 30 seconds                                              │
│                                                                               │
│ Time: 10:05:00 - First load                                                 │
│ Time: 10:05:30 - (Data refreshed)                                            │
│ Time: 10:06:00 - (Data refreshed)                                            │
│ Time: 10:06:30 - (Data refreshed)                                            │
│ ...                                                                          │
│                                                                               │
│ Each refresh fetches:                                                        │
│   ├─ Updated active deliveries                                             │
│   ├─ Updated available orders (with fresh distance calcs)                  │
│   ├─ Today's earnings                                                       │
│   └─ Daily goal progress                                                    │
│                                                                               │
│ Why 30 seconds? 🤔                                                           │
│   • Frequent enough: Driver sees new orders quickly                         │
│   • Not too frequent: Reduces server load                                   │
│   • Battery efficient: Not draining constantly                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

CONTINUOUS LOCATION TRACKING
┌──────────────────────────────────────────────────────────────────────────────┐
│ Browser's watchPosition() runs in background:                                │
│                                                                               │
│ navigator.geolocation.watchPosition(                                         │
│   (position) => {                                                            │
│     updateDriverLocation(                                                    │
│       position.coords.latitude,                                              │
│       position.coords.longitude                                              │
│     );                                                                       │
│   },                                                                         │
│   (error) => {...},                                                          │
│   {                                                                          │
│     enableHighAccuracy: true,  // Uses GPS if available                     │
│     maximumAge: 0,            // Always fresh (not cached)                  │
│     timeout: 5000             // Max 5 seconds to get location               │
│   }                                                                          │
│ );                                                                           │
│                                                                               │
│ Every time driver moves → Browser detects → Updates backend                │
│                                                                               │
│ Timeline:                                                                    │
│ 10:05:32 - Location: 23.8010, 90.3535 (at store)                            │
│ 10:05:45 - Location: 23.8020, 90.3540 (moving to buyer)                     │
│ 10:06:00 - Location: 23.8035, 90.3550 (en route)                            │
│ 10:06:15 - Location: 23.8050, 90.3560 (almost there)                        │
│ ...                                                                          │
│                                                                               │
│ Backend stores each location update                                          │
│ Used later for: distance calculations to stores                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

DISTANCE & DELIVERY FEE CALCULATION
┌──────────────────────────────────────────────────────────────────────────────┐
│ When calculating available orders:                                           │
│                                                                               │
│ For each available order:                                                    │
│   ├─ Get driver's current location: [90.3535, 23.8010]                      │
│   ├─ Get store location from order: [90.4100, 23.8500]                      │
│   │                                                                          │
│   └─ Call Google Maps API:                                                   │
│       calculateDistanceWithGoogle(                                           │
│         [driverLat, driverLng],  // [23.8010, 90.3535]                     │
│         [storeLat, storeLng]     // [23.8500, 90.4100]                     │
│       )                                                                      │
│                                                                               │
│       Google Maps returns:                                                   │
│       {                                                                      │
│         distanceKm: 7.5,         ← Actual route distance                    │
│         durationMinutes: 18      ← Actual driving time                      │
│       }                                                                      │
│                                                                               │
│   Calculate delivery fee:                                                    │
│   fee = BASE_FEE + (distanceKm * PER_KM_FEE)                               │
│   fee = 40 + (7.5 * 10)                                                     │
│   fee = 40 + 75 = ৳115                                                       │
│                                                                               │
│ Shown to driver:                                                             │
│ Distance: 7.5 km                                                             │
│ Est. Time: 18 minutes                                                        │
│ Delivery Fee: ৳115                                                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

DRIVER TOGGLES OFFLINE
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver gets tired / end of shift:                                            │
│   Clicks: "GO OFFLINE"                                                       │
│                                                                               │
│ Frontend: POST /api/driver/status                                           │
│ Body: { online: false }                                                     │
│                                                                               │
│ Backend updates:                                                             │
│ User { isOnline: false }                                                     │
│                                                                               │
│ Effects:                                                                     │
│   ✓ Driver no longer appears in available-drivers list                      │
│   ✓ New orders don't show to this driver                                    │
│   ✓ Can't claim new orders                                                   │
│   ✓ Location tracking stops (watchPosition cleared)                         │
│   ✓ 30-second refresh stops                                                 │
│   ✓ Active deliveries still show (for driver reference)                     │
│   ✓ Can go back online with one click                                       │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
```

---

## Feature 4: Automated Newsletters - Email Sending Flow

```
═══════════════════════════════════════════════════════════════════════════════════

ADMIN TRIGGERS WEEKLY NEWSLETTER
┌──────────────────────────────────────────────────────────────────────────────┐
│ Admin Dashboard:                                                             │
│   Clicks: "Send Weekly Newsletter"                                           │
│                                                                               │
│ Frontend: POST /api/newsletter/send                                         │
│ (No body needed, admin permission checked)                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

BACKEND: GET SPONSORED PRODUCTS
┌──────────────────────────────────────────────────────────────────────────────┐
│ sendWeeklyNewsletter() in server/src/services/newsletter.ts                 │
│                                                                               │
│ 1. Calculate 7 days ago:                                                     │
│    oneWeekAgo = new Date() - 7 days                                          │
│    = 2026-04-21                                                              │
│                                                                               │
│ 2. Query MongoDB:                                                            │
│    Product.find({                                                            │
│      sponsored: true,                                                        │
│      createdAt: { $gte: oneWeekAgo }                                        │
│    }).limit(10)                                                              │
│                                                                               │
│ 3. Returns top 10 sponsored products created last 7 days:                    │
│    ┌─────────────────────────────────────────────────────────────┐           │
│    │ Product 1: Organic Milk - ৳180 (Store A)                   │           │
│    │ Product 2: Greek Yogurt - ৳250 (Store A)                  │           │
│    │ Product 3: Butter - ৳350 (Store B)                         │           │
│    │ Product 4: Cheese - ৳400 (Store B)                         │           │
│    │ Product 5: Ice Cream - ৳150 (Store C)                      │           │
│    │ ... (up to 10)                                             │           │
│    └─────────────────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

BACKEND: GROUP BUYERS BY NEIGHBORHOOD
┌──────────────────────────────────────────────────────────────────────────────┐
│ Get all buyers:                                                              │
│ User.find({ roles: 'buyer', neighborhood: { $exists: true } })             │
│                                                                               │
│ Results:                                                                     │
│ ┌──────────────────────────────────────────────────────────────┐            │
│ │ User 1: "Fatima" - neighborhood: "Dhanmondi"                │            │
│ │ User 2: "Karim" - neighborhood: "Dhanmondi"                 │            │
│ │ User 3: "Aisha" - neighborhood: "Gulshan"                   │            │
│ │ User 4: "Ravi" - neighborhood: "Gulshan"                    │            │
│ │ User 5: "Priya" - neighborhood: "Banani"                    │            │
│ │ ... (more buyers)                                           │            │
│ └──────────────────────────────────────────────────────────────┘            │
│                                                                               │
│ Group by neighborhood:                                                       │
│ {                                                                            │
│   "Dhanmondi": [                                                             │
│     "fatima@email.com",                                                      │
│     "karim@email.com"                                                        │
│   ],                                                                         │
│   "Gulshan": [                                                               │
│     "aisha@email.com",                                                       │
│     "ravi@email.com"                                                         │
│   ],                                                                         │
│   "Banani": [                                                                │
│     "priya@email.com"                                                        │
│   ],                                                                         │
│   ... (more neighborhoods)                                                  │
│ }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

BACKEND: FOR EACH NEIGHBORHOOD, GENERATE & SEND EMAIL
┌──────────────────────────────────────────────────────────────────────────────┐
│ Loop through neighborhoods:                                                  │
│                                                                               │
│ ╔═ NEIGHBORHOOD: "Dhanmondi" ════════════════════════════════════════════╗  │
│ ║                                                                        ║  │
│ ║ 1. Generate HTML email:                                              ║  │
│ ║    generateNewsletterHTML("Dhanmondi", [product1, product2, ...])   ║  │
│ ║                                                                        ║  │
│ ║    HTML Output:                                                       ║  │
│ ║    ┌─────────────────────────────────────────────────────────────┐  ║  │
│ ║    │ <!DOCTYPE html>                                             │  ║  │
│ ║    │ <html>                                                      │  ║  │
│ ║    │   <head>                                                    │  ║  │
│ ║    │     <title>Weekly Deals in Dhanmondi</title>                │  ║  │
│ ║    │   </head>                                                   │  ║  │
│ ║    │   <body>                                                    │  ║  │
│ ║    │     <h1>Weekly Sponsored Deals in Dhanmondi 🎉</h1>        │  ║  │
│ ║    │     <div class="products">                                 │  ║  │
│ ║    │       <div class="product-card">                            │  ║  │
│ ║    │         <img src="milk.jpg" />                              │  ║  │
│ ║    │         <h3>Organic Milk</h3>                               │  ║  │
│ ║    │         <p>Fresh from local farms</p>                       │  ║  │
│ ║    │         <price>৳180</price>                                 │  ║  │
│ ║    │         <a href="https://...">View & Order</a>              │  ║  │
│ ║    │       </div>                                                │  ║  │
│ ║    │       <div class="product-card">                            │  ║  │
│ ║    │         <img src="yogurt.jpg" />                            │  ║  │
│ ║    │         <h3>Greek Yogurt</h3>                               │  ║  │
│ ║    │         <p>Creamy & rich</p>                                │  ║  │
│ ║    │         <price>৳250</price>                                 │  ║  │
│ ║    │         <a href="https://...">View & Order</a>              │  ║  │
│ ║    │       </div>                                                │  ║  │
│ ║    │       ... (more products)                                  │  ║  │
│ ║    │     </div>                                                  │  ║  │
│ ║    │     <footer>                                                │  ║  │
│ ║    │       <a href="unsubscribe">Unsubscribe</a>                 │  ║  │
│ ║    │     </footer>                                               │  ║  │
│ ║    │   </body>                                                   │  ║  │
│ ║    │ </html>                                                     │  ║  │
│ ║    └─────────────────────────────────────────────────────────────┘  ║  │
│ ║                                                                        ║  │
│ ║ 2. Create SendGrid message:                                          ║  │
│ ║    {                                                                  ║  │
│ ║      to: ["fatima@email.com", "karim@email.com"],                   ║  │
│ ║      from: "deals@bazar-koro.com",                                   ║  │
│ ║      subject: "Weekly Sponsored Deals in Dhanmondi",                 ║  │
│ ║      html: "<html>...</html>"                                        ║  │
│ ║    }                                                                  ║  │
│ ║                                                                        ║  │
│ ║ 3. Send via SendGrid:                                                ║  │
│ ║    await sgMail.sendMultiple(msg)                                    ║  │
│ ║                                                                        ║  │
│ ║ 4. Log success:                                                      ║  │
│ ║    console.log("Sent newsletter to 2 buyers in Dhanmondi")           ║  │
│ ║                                                                        ║  │
│ ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                               │
│ ╔═ NEIGHBORHOOD: "Gulshan" ══════════════════════════════════════════════╗  │
│ ║ (Repeat same process for ["aisha@email.com", "ravi@email.com"])      ║  │
│ ║ console.log("Sent newsletter to 2 buyers in Gulshan")                 ║  │
│ ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                               │
│ ╔═ NEIGHBORHOOD: "Banani" ═══════════════════════════════════════════════╗  │
│ ║ (Repeat same process for ["priya@email.com"])                        ║  │
│ ║ console.log("Sent newsletter to 1 buyer in Banani")                  ║  │
│ ╚════════════════════════════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

BUYERS RECEIVE EMAILS
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dhanmondi Buyers (Fatima & Karim):                                          │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────┐                 │
│ │ From: deals@bazar-koro.com                             │                 │
│ │ Subject: Weekly Sponsored Deals in Dhanmondi           │                 │
│ │ ────────────────────────────────────────────────────────│                 │
│ │                                                         │                 │
│ │ 🎉 Weekly Sponsored Deals in Dhanmondi 🎉              │                 │
│ │                                                         │                 │
│ │ [Organic Milk Image]                                   │                 │
│ │ Organic Milk                                            │                 │
│ │ Fresh from local farms                                 │                 │
│ │ ৳180                                                    │                 │
│ │ [View & Order]                                         │                 │
│ │                                                         │                 │
│ │ [Greek Yogurt Image]                                   │                 │
│ │ Greek Yogurt                                            │                 │
│ │ Creamy & rich                                          │                 │
│ │ ৳250                                                    │                 │
│ │ [View & Order]                                         │                 │
│ │                                                         │                 │
│ │ ... (more products)                                    │                 │
│ │                                                         │                 │
│ │ [Unsubscribe]                                          │                 │
│ └─────────────────────────────────────────────────────────┘                 │
│                                                                               │
│ Gulshan Buyers (Aisha & Ravi):                                              │
│   Get same products but subject says "in Gulshan"                           │
│                                                                               │
│ Banani Buyer (Priya):                                                        │
│   Gets same products but subject says "in Banani"                           │
│                                                                               │
│ Each neighborhood gets:                                                      │
│   ✓ Same top 10 products                                                     │
│   ✓ Personalized subject line (neighborhood-specific)                       │
│   ✓ Professional HTML rendering                                             │
│   ✓ Tracking: opens, clicks, bounces                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

SENDGRID TRACKING
┌──────────────────────────────────────────────────────────────────────────────┐
│ SendGrid automatically tracks:                                               │
│                                                                               │
│ Event 1: Email Sent (2 recipients)                                          │
│   → fatima@email.com: Email delivered                                       │
│   → karim@email.com: Email delivered                                        │
│                                                                               │
│ Event 2: Email Opened (3 hours later)                                       │
│   → fatima@email.com: Opened at 2026-04-28T13:00:00Z                       │
│   → karim@email.com: Opened at 2026-04-28T14:30:00Z                        │
│                                                                               │
│ Event 3: Link Clicked (Buyer clicks "View & Order")                         │
│   → fatima@email.com: Clicked "Organic Milk" product link                   │
│   → Redirects to product page                                                │
│   → Buyer adds to cart & purchases                                          │
│                                                                               │
│ SendGrid Dashboard shows:                                                    │
│   Total Sent: 100 emails (example)                                          │
│   Delivered: 98                                                              │
│   Opened: 45 (45%)                                                          │
│   Clicked: 23 (23%)                                                         │
│   Bounced: 2                                                                │
│   Unsubscribed: 1                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
```

---

## Feature 5: Delivery Status Updates - Step-by-Step

```
═══════════════════════════════════════════════════════════════════════════════════

STEP 1: DRIVER CLAIMS ORDER
┌──────────────────────────────────────────────────────────────────────────────┐
│ Order Status Before: 'ready_for_pickup'                                      │
│ Driver clicks: [CLAIM ORDER]                                                 │
│                                                                               │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: { status: "claimed" }                                                 │
│                                                                               │
│ Server Updates:                                                              │
│ Order Document:                                                              │
│   status: 'claimed'                                                          │
│   delivery.driverId: 'DRIVER789'                                             │
│   updatedAt: 2026-04-28T10:15:00Z                                            │
│                                                                               │
│ Result: Order now appears in driver's "Active Deliveries" list              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 2: DRIVER GOES TO STORE
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver navigates to store location                                           │
│ Driver arrives at store                                                      │
│                                                                               │
│ Driver clicks: [✓ At Store]                                                  │
│                                                                               │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: { status: "at_store" }                                                │
│                                                                               │
│ Status Flow:                                                                 │
│ 'claimed' → 'at_store'                                                       │
│                                                                               │
│ Seller receives notification: Driver arrived at store                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 3: DRIVER PICKS UP ITEMS
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver goes inside store                                                     │
│ Seller gives driver:                                                         │
│   - 2x Milk bottles                                                          │
│   - 1x Tray of eggs                                                          │
│ Driver loads items into bike/car                                             │
│                                                                               │
│ Driver clicks: [✓ Picked Up]                                                 │
│                                                                               │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: { status: "picked_up" }                                               │
│                                                                               │
│ Status Flow:                                                                 │
│ 'at_store' → 'picked_up'                                                     │
│                                                                               │
│ Buyer gets notification: Your order is on the way!                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 4: DRIVER EN ROUTE TO BUYER
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver starts driving to buyer's location                                    │
│                                                                               │
│ Driver clicks: [✓ On the Way]                                                │
│                                                                               │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: { status: "on_the_way" }                                              │
│                                                                               │
│ Status Flow:                                                                 │
│ 'picked_up' → 'on_the_way'                                                   │
│                                                                               │
│ Buyer can see: Order is being delivered now                                 │
│ Buyer might see driver's real-time location (if implemented)                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 5: DRIVER ARRIVES AT BUYER LOCATION
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver arrives at buyer's address                                            │
│ Driver is waiting for buyer to come out OR knocking on door                 │
│                                                                               │
│ Driver clicks: [✓ Deliver & Verify PIN]                                      │
│ This opens a modal dialog:                                                   │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────┐              │
│ │ Delivery Confirmation                                       │              │
│ │                                                             │              │
│ │ Order #123ABC                                              │              │
│ │ Items: 2x Milk, 1x Eggs                                    │              │
│ │                                                             │              │
│ │ Enter last 4 digits of PIN:                                │              │
│ │ ┌────────────────┐                                         │              │
│ │ │ [4] [7] [2] [9]│  ← Driver enters PIN shown to buyer    │              │
│ │ └────────────────┘                                         │              │
│ │                                                             │              │
│ │ Optional: Upload delivery photo:                           │              │
│ │ [Choose File] photo_delivery.jpg                           │              │
│ │                                                             │              │
│ │ [Confirm Delivery]                                         │              │
│ └─────────────────────────────────────────────────────────────┘              │
│                                                                               │
│ What Happens Behind Scenes:                                                 │
│                                                                               │
│ 1. PIN Verification:                                                        │
│    Driver entered: "4729"                                                    │
│    Order.delivery.deliveryPin stored: "4729"                                │
│    pinLast4 = "4729".slice(-4) = "4729"                                     │
│    Match? YES ✓                                                              │
│                                                                               │
│ 2. Why last 4 digits?                                                       │
│    - Full PIN (e.g., "4729") is given to buyer                              │
│    - Driver confirms by entering the PIN                                    │
│    - Prevents fake deliveries (confirms right person)                       │
│    - We only store last 4 digits for privacy                                │
│                                                                               │
│ 3. Photo (optional):                                                        │
│    - Driver can upload photo of delivery                                    │
│    - Creates evidence for disputes                                          │
│    - Uploaded to storage (AWS S3, etc)                                      │
│    - URL stored in Order.delivery.proof.photoUrl                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

STEP 6: MARK AS DELIVERED
┌──────────────────────────────────────────────────────────────────────────────┐
│ Driver clicks: [Confirm Delivery] button                                     │
│                                                                               │
│ Frontend validates:                                                          │
│   ✓ PIN entered (not empty)                                                  │
│   ✓ PIN is exactly 4 characters                                              │
│                                                                               │
│ If valid → Send request:                                                     │
│ PATCH /api/orders/ORDER123/status                                           │
│ Body: {                                                                      │
│   status: "delivered",                                                       │
│   proof: {                                                                   │
│     pinLast4: "4729",                                                        │
│     photoUrl: "https://storage.example.com/photo_delivery.jpg"             │
│   }                                                                          │
│ }                                                                            │
│                                                                               │
│ Server validates:                                                            │
│   ✓ PIN matches                                                              │
│   ✓ Driver is assigned to this order                                        │
│   ✓ Current status is not already 'delivered'                               │
│                                                                               │
│ Server updates order:                                                        │
│ {                                                                            │
│   status: 'delivered',                                                       │
│   delivery: {                                                                │
│     driverId: 'DRIVER789',                                                   │
│     deliveryPin: '4729',                                                     │
│     proof: {                                                                 │
│       pinLast4: '4729',                                                      │
│       photoUrl: 'https://...'                                                │
│     }                                                                        │
│   },                                                                         │
│   updatedAt: 2026-04-28T10:25:00Z                                            │
│ }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓

FINAL STATE: ORDER COMPLETE
┌──────────────────────────────────────────────────────────────────────────────┐
│ Order Status Timeline:                                                       │
│                                                                               │
│ 10:00 - 'placed'              ← Buyer created order                         │
│ 10:05 - 'accepted'            ← Seller accepted                             │
│ 10:07 - 'ready_for_pickup'    ← Seller finished preparing                   │
│ 10:10 - 'claimed'             ← Driver claimed order                        │
│ 10:15 - 'at_store'            ← Driver at store                             │
│ 10:17 - 'picked_up'           ← Driver has items                            │
│ 10:20 - 'on_the_way'          ← Driver en route                             │
│ 10:25 - 'delivered'           ← COMPLETE ✓                                   │
│        └─ PIN verified ✓                                                     │
│        └─ Photo attached ✓                                                   │
│        └─ Delivery fee credited to driver: ৳65                              │
│        └─ Payment finalized                                                  │
│                                                                               │
│ What Happens Next:                                                           │
│   ├─ Driver's earnings updated (+৳65)                                        │
│   ├─ Order removed from "Active Deliveries"                                 │
│   ├─ Buyer can now leave review for seller                                  │
│   ├─ Seller can see order marked as complete                                │
│   └─ Order archived in history                                              │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
```

---

## Key Security Features

```
1. PIN Verification
   ├─ Random 4-digit PIN generated when order placed
   ├─ PIN given to buyer separately
   ├─ Driver enters PIN when delivering
   └─ Prevents fake deliveries

2. Role-Based Access Control
   ├─ Only assigned driver can update status
   ├─ Other drivers can't interfere
   ├─ Seller can't mark as 'delivered'
   └─ Buyer can't change to 'accepted'

3. Atomic Operations
   ├─ Claim operation is atomic (MongoDB guarantees)
   ├─ Only ONE driver can claim order
   ├─ Race condition prevented
   └─ No duplicate deliveries possible

4. Online Status Requirement
   ├─ Driver must be online to claim
   ├─ Prevents offline drivers from claiming
   └─ Ensures someone is actively delivering

5. Photo Evidence (Optional)
   ├─ Driver can upload photo
   ├─ Proves delivery occurred
   └─ Useful for disputes
```

---

That's it! You now have comprehensive documentation of all 5 features! 🎉

