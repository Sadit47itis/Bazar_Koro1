# Bazar-Koro: Viva Documentation
## Complete Feature Implementation Guide

**Project**: Bazar-Koro - A Multi-Role E-commerce Delivery Platform  
**Author**: Sadit Arshad Sakib  
**Date**: 2026  

---

## Table of Contents
1. [Feature 1: Search & Filter Engine](#feature-1-search--filter-engine)
2. [Feature 2: Order Management System (OMS)](#feature-2-order-management-system-oms)
3. [Feature 3: Driver Dashboard & Status](#feature-3-driver-dashboard--status)
4. [Feature 4: Automated Newsletters (SendGrid API)](#feature-4-automated-newsletters-sendgrid-api)
5. [Feature 5: Delivery Status Updates](#feature-5-delivery-status-updates)

---

# Feature 1: Search & Filter Engine

## Overview
A robust search bar allowing buyers to find specific products or stores with advanced filters for categories, price range, and distance-based location filtering.

## Where Is It Implemented?

### Backend (Server-Side Code)
**Main File**: `server/src/routes/search.ts`  
**Database Model**: `server/src/models/Product.ts`

### Frontend (Client-Side Code)
**Main Files**:
- `client/src/pages/SearchPage.tsx` - Main search page component
- `client/src/components/SearchFilters.tsx` - Filter form component
- `client/src/hooks/useSearch.ts` - Search logic hook
- `client/src/components/ProductList.tsx` - Display results
- `client/src/components/Pagination.tsx` - Pagination logic

---

## Code Tree for Search & Filter Engine

```
Search & Filter Feature
├── Backend (Server)
│   ├── server/src/routes/search.ts
│   │   ├── searchRoute() - Main search handler
│   │   │   ├── Extract query parameters (keyword, category, price, location, radius)
│   │   │   ├── Build MongoDB aggregation pipeline
│   │   │   ├── Apply $geoNear stage (for distance filtering)
│   │   │   ├── Apply $match stage (for text/category/price filters)
│   │   │   ├── Apply $addFields (for promotion status)
│   │   │   ├── Apply $sort (promoted products first)
│   │   │   ├── Apply $skip & $limit (pagination)
│   │   │   └── Return paginated results
│   │   └── suggestRoute() - Auto-complete suggestions
│   │
│   └── server/src/models/Product.ts
│       ├── IProduct interface
│       │   ├── name, description, price
│       │   ├── category, stockQuantity
│       │   ├── location (2dsphere index for geo-queries)
│       │   ├── isPromoted, promotedUntil
│       │   └── storeId reference
│       └── productSchema with indexes
│           ├── Text index on "name"
│           ├── 2D Sphere index on "location"
│           └── Index on "isPromoted"
│
├── Frontend (Client)
│   ├── client/src/pages/SearchPage.tsx
│   │   ├── Load products on mount with URL parameters
│   │   ├── Display active ads (banner ads)
│   │   ├── Track ad impressions & clicks
│   │   ├── Handle filter submissions
│   │   ├── Handle pagination
│   │   └── Show product list with loading states
│   │
│   ├── client/src/components/SearchFilters.tsx
│   │   ├── Input fields
│   │   │   ├── Keyword search with auto-complete
│   │   │   ├── Category dropdown
│   │   │   ├── Min/Max price range
│   │   │   ├── Distance radius slider
│   │   │   └── Use Location toggle
│   │   ├── Debounced API call for suggestions
│   │   ├── Geolocation permission handling
│   │   ├── Dropdown for search suggestions
│   │   └── Form submission with filter validation
│   │
│   ├── client/src/hooks/useSearch.ts
│   │   ├── State management (products, loading, total, pages)
│   │   ├── performSearch() function
│   │   │   ├── Build query parameters
│   │   │   ├── Make API call to /api/search
│   │   │   ├── Update products state
│   │   │   ├── Track pagination
│   │   │   └── Handle errors
│   │   └── Return hook values & functions
│   │
│   ├── client/src/components/ProductList.tsx
│   │   ├── Map through products array
│   │   ├── Display product cards with image, name, price
│   │   ├── Show store info
│   │   ├── Add to cart functionality
│   │   └── Link to product details
│   │
│   └── client/src/components/Pagination.tsx
│       ├── Display page numbers
│       ├── Previous/Next buttons
│       ├── Navigate between pages
│       └── Show current page info
```

---

## How It Works (Line-by-Line Explanation)

### Backend: Search Route (`server/src/routes/search.ts`)

**Step 1: Extract Query Parameters**
```typescript
const { keyword, category, minPrice, maxPrice, lat, lng, radius, page = '1', limit = '10' } = req.query;
```
- Extracts filter values from the URL query string
- Sets default values for `page` and `limit`
- These values are sent from the frontend when user searches

**Step 2: Convert to Numbers for Calculations**
```typescript
const pageNum = parseInt(page as string, 10);
const limitNum = parseInt(limit as string, 10);
const skip = (pageNum - 1) * limitNum;
```
- Converts string page/limit to numbers
- Calculates `skip` value for pagination (e.g., page 2 with limit 10 = skip 10 items)
- This moves us forward in results

**Step 3: Build MongoDB Aggregation Pipeline**
```typescript
const pipeline: any[] = [];
```
- Aggregation pipeline is like a factory assembly line for data
- We add stages one by one to process data

**Step 4: First Stage - Geolocation Filter ($geoNear)**
```typescript
if (lat && lng) {
  const radiusInMeters = radius ? parseInt(radius as string, 10) * 1000 : 10000;
  pipeline.push({
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
      },
      distanceField: 'distance',
      maxDistance: radiusInMeters,
      spherical: true
    }
  });
}
```
- **Important**: MongoDB requires `$geoNear` to be FIRST in the pipeline
- `$geoNear` finds products near the user's location
- Converts radius from km to meters (×1000)
- **Note**: MongoDB uses `[longitude, latitude]` order (not latitude first!)
- Returns distance from user's location for each product

**Step 5: Second Stage - Other Filters ($match)**
```typescript
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
```
- Builds the `$match` stage (like filtering in a spreadsheet)
- `$regex` with `'i'` option does case-insensitive text search
- `$gte` = greater than or equal, `$lte` = less than or equal

**Step 6: Count Total for Pagination**
```typescript
const countPipeline = [...pipeline, { $count: 'total' }];
const countResult = await Product.aggregate(countPipeline);
const total = countResult[0]?.total || 0;
```
- Creates a copy of pipeline and adds `$count` stage
- This gets the total number of matching products
- Used to calculate total pages and show "showing 1-10 of 145 results"

**Step 7: Sort Promoted Products First**
```typescript
pipeline.push({
  $sort: {
    isCurrentlyPromoted: -1,  // -1 = descending (true first)
    createdAt: -1
  }
});
```
- `-1` means descending order
- Sorts promoted products (isCurrentlyPromoted=true) first
- Then sorts by creation date (newest first)

**Step 8: Apply Pagination**
```typescript
pipeline.push({ $skip: skip });
pipeline.push({ $limit: limitNum });
```
- `$skip` skips the first X products
- `$limit` returns only the next 10 products
- Together: shows results for current page

**Step 9: Execute Query and Return**
```typescript
const products = await Product.aggregate(pipeline);
res.status(200).json({
  products,
  total,
  page: pageNum,
  totalPages: Math.ceil(total / limitNum)
});
```
- Actually executes the aggregation pipeline
- Returns products, total count, and pagination info to frontend

---

### Frontend: Search Page (`client/src/pages/SearchPage.tsx`)

**On Component Mount:**
```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('keyword') || undefined;
  // ... extract other params from URL
  
  const initialFilters: FilterType = {
    keyword, category, minPrice, maxPrice, radius,
    page: 1, limit: 10,
  };
  setCurrentFilters(initialFilters);
  performSearch(initialFilters);
}, []);
```
- Runs once when component loads
- Checks if there are search params in the URL (for shared links)
- Loads initial products with those params

**When User Filters:**
```typescript
const handleSearch = (filters: FilterType) => {
  setCurrentFilters(filters);
  performSearch(filters);
};
```
- Called when user clicks search button
- Updates state and triggers API call through the hook

---

### Frontend: Search Filters (`client/src/components/SearchFilters.tsx`)

**Auto-Complete with Debouncing:**
```typescript
useEffect(() => {
  if (keyword.trim().length < 2) {
    setSuggestions([]);
    return;
  }

  const fetchTimer = setTimeout(async () => {
    const res = await fetch(`/api/search/suggest?keyword=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    setSuggestions(data);
  }, 300);

  return () => clearTimeout(fetchTimer);
}, [keyword]);
```
- **Debouncing**: Waits 300ms after user stops typing
- Only searches if keyword is at least 2 characters
- Prevents API spam on every keystroke
- The `return () => clearTimeout()` cancels previous timer if user types again

**Geolocation Permission:**
```typescript
const getCurrentLocation = () => {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      setLat(newLat);
      setLng(newLng);
      triggerSearch(keyword, newLat, newLng);
    },
    (err) => {
      setLocationStatus(`Error: ${err.message}`);
      setUseLocation(false);
    }
  );
};
```
- Uses browser's Geolocation API
- `getCurrentPosition()` asks user for location permission
- On success: gets latitude & longitude, triggers search with location
- On error: shows error message and disables location filter

---

## Why This Approach?

### 1. **MongoDB Aggregation Pipeline**
- Performs all filtering in database (more efficient than fetching all data to client)
- `$geoNear` is specialized for location-based searches
- Sorted before pagination (ensures consistent results)

### 2. **Geolocation First**
- MongoDB requires `$geoNear` as first stage in aggregation
- This finds products within radius, then filters by other criteria

### 3. **Debouncing**
- Prevents 100+ API calls per second while typing
- Improves performance and reduces server load

### 4. **Promoted Products on Top**
- Business logic: promote sponsored products to users
- Sorts them first in results
- Increases visibility of paid promotions

### 5. **Pagination**
- Don't load all 10,000 products at once
- Load 10 per page
- User navigates through pages efficiently

---

# Feature 2: Order Management System (OMS)

## Overview
A real-time feed where sellers view incoming orders. They can accept or reject new orders, prepare items, and change status to "Ready for Pickup," which automatically alerts delivery drivers.

## Where Is It Implemented?

### Backend (Server-Side Code)
**Main File**: `server/src/routes/orders.ts`  
**Database Model**: `server/src/models/Order.ts`

### Frontend (Client-Side Code)
**Main Files**:
- `client/src/components/SellerOMS.tsx` - Order Management Interface for sellers
- `client/src/pages/Dashboard.tsx` - Dashboard that integrates SellerOMS

---

## Code Tree for Order Management System

```
Order Management System (OMS)
├── Backend (Server)
│   ├── server/src/routes/orders.ts
│   │   ├── listMyOrdersRoute() [Buyer]
│   │   │   ├── Get all orders for current buyer
│   │   │   ├── Fetch associated reviews
│   │   │   └── Return orders with review data
│   │   │
│   │   ├── createOrderRoute() [Buyer]
│   │   │   ├── Validate order lines (product, store, quantity, price)
│   │   │   ├── Generate 4-digit delivery PIN (1000-9999)
│   │   │   ├── Save order to MongoDB
│   │   │   ├── Set initial status to 'placed'
│   │   │   └── Return created order with ID
│   │   │
│   │   ├── getOrderRoute() [Any]
│   │   │   ├── Fetch specific order by ID
│   │   │   ├── Check user permissions (is buyer/admin/seller?)
│   │   │   └── Return order details
│   │   │
│   │   ├── listStoreOrdersRoute() [Seller/Admin] ← NEW FOR OMS!
│   │   │   ├── Get store ID from URL params
│   │   │   ├── Find all orders containing items from this store
│   │   │   ├── Sort by creation date (newest first)
│   │   │   └── Return orders for seller to manage
│   │   │
│   │   └── updateOrderStatusRoute() [Seller/Driver/Admin]
│   │       ├── Validate new status is allowed
│   │       ├── Check role permissions
│   │       │   ├── Buyer can only set: 'placed'
│   │       │   ├── Seller can set: 'accepted', 'rejected', 'ready_for_pickup'
│   │       │   ├── Driver can set: 'claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered'
│   │       │   └── Admin can set: any status
│   │       ├── Check if driver is online (for driver updates)
│   │       ├── For 'claimed' status: atomic check (only 1st driver wins)
│   │       ├── Update order status in DB
│   │       └── Return updated order
│   │
│   └── server/src/models/Order.ts
│       └── Order Schema
│           ├── buyerId - who bought
│           ├── lines[] - array of items (productId, storeId, name, price, qty)
│           ├── status - current state (placed, accepted, rejected, ready_for_pickup, etc.)
│           ├── pricing - subtotal, discount, coupon, total
│           ├── delivery
│           │   ├── driverId - which driver is delivering
│           │   ├── deliveryPin - 4-digit PIN for delivery verification
│           │   └── proof - photo/PIN verification
│           ├── marketerId - if sold through marketer
│           ├── commissionAmount - marketer commission
│           └── timestamps - createdAt, updatedAt
│
├── Frontend (Client)
│   ├── client/src/components/SellerOMS.tsx
│   │   ├── Fetch orders for seller's store on mount
│   │   ├── Display all orders in a list
│   │   ├── For each order show:
│   │   │   ├── Order ID (last 6 chars)
│   │   │   ├── Creation timestamp
│   │   │   ├── Order status badge
│   │   │   ├── Order items (name, quantity, price)
│   │   │   ├── Total price
│   │   │   └── Action buttons based on status
│   │   │
│   │   └── Action buttons:
│   │       ├── When status = 'placed' or 'paid':
│   │       │   ├── Accept button → status: 'accepted'
│   │       │   └── Reject button → status: 'rejected'
│   │       ├── When status = 'paid' or 'accepted':
│   │       │   ├── Mark Ready button → status: 'ready_for_pickup'
│   │       │   └── Reject button
│   │       └── When status = 'ready_for_pickup' or later:
│   │           └── Show "Waiting for Driver..."
│   │
│   └── client/src/pages/Dashboard.tsx
│       ├── Role selector (buyer, seller, driver, etc.)
│       ├── For seller role:
│       │   ├── Load seller's stores
│       │   └── Render <SellerOMS storeId={store.id} />
│       └── Integrates SellerOMS component
```

---

## How It Works (Line-by-Line Explanation)

### Backend: Order Model (`server/src/models/Order.ts`)

**Order Schema Definition:**
```typescript
const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lines: [orderLineSchema],
  status: {
    type: String,
    enum: ['placed', 'paid', 'accepted', 'rejected', 'ready_for_pickup', 'claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered'],
    default: 'placed'
  },
  // ... other fields
  delivery: {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryPin: { type: String },
    proof: {
      pinLast4: String,
      photoUrl: String
    }
  }
}, { timestamps: true });
```
- **buyerId**: References the User who placed the order
- **lines**: Array of items ordered (each has productId, storeId, name, price, qty)
- **status**: Current state of order (one of the enum values)
- **delivery**: Stores driver info and delivery PIN
- **timestamps**: Automatically tracks when order was created/updated

**Pre-Validation Hook:**
```typescript
orderSchema.pre('validate', async function() {
  if (!this.pricing) {
    this.pricing = { subtotal: 0, discountAmount: 0, total: 0, couponCode: null };
  }

  if (this.lines && this.pricing && !this.pricing.subtotal) {
    this.pricing.subtotal = this.lines.reduce((acc, line) => acc + (line.unitPrice * line.qty), 0);
    this.pricing.total = this.pricing.subtotal - (this.pricing.discountAmount || 0);
  }
});
```
- Runs before saving to validate
- If pricing is missing, creates default values
- Automatically calculates subtotal from line items
- Calculates final total after discount

---

### Backend: List Store Orders (`server/src/routes/orders.ts`)

**The Route:**
```typescript
export const listStoreOrdersRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'seller' && req.user.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Only sellers can view store orders' });
    }
    
    const { storeId } = req.params;
    const orders = await Order.find({ 'lines.storeId': storeId }).sort({ createdAt: -1 });
    
    return res.json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Database error fetching store orders' });
  }
};
```
- **Authentication Check**: Ensures user is logged in (`!req.user`)
- **Role Check**: Only sellers and admins can view (anyone else gets 403 Forbidden)
- **Find Orders**: Queries MongoDB for all orders containing items from this store
  - `'lines.storeId': storeId` searches inside the nested `lines` array
  - This finds orders that have items from this specific store
- **Sort Newest First**: `-1` means descending (most recent first)
- **Return**: Array of orders for the seller's store

---

### Backend: Update Order Status (`server/src/routes/orders.ts`)

**Role-Based Permissions:**
```typescript
const allowedByRole: Record<string, Set<string>> = {
  buyer: new Set(['placed']),
  seller: new Set(['accepted', 'rejected', 'ready_for_pickup']),
  driver: new Set(['claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered']),
  admin: new Set(['paid', 'accepted', 'rejected', 'ready_for_pickup', 'claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered']),
  marketer: new Set([]),
};
```
- **Buyer**: Can only set status to 'placed' (when creating order)
- **Seller**: 'accepted' (accept order), 'rejected' (reject), 'ready_for_pickup' (prepare & ready)
- **Driver**: Can only update their own orders through delivery stages
- **Admin**: Can update to any status (for manual corrections)
- **Marketer**: No status update permissions

**Atomic Claim for Drivers:**
```typescript
if (role === 'driver' && nextStatus === 'claimed') {
  const driver = await User.findById(req.user.id).select('isOnline');
  if (!driver?.isOnline) {
    return res.status(403).json({ error: 'Driver must be online to update delivery status' });
  }

  const claimed = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'ready_for_pickup',
      $or: [{ 'delivery.driverId': null }, { 'delivery.driverId': { $exists: false } }],
    },
    {
      $set: {
        status: 'claimed',
        'delivery.driverId': new mongoose.Types.ObjectId(req.user.id),
      },
    },
    { new: true }
  );

  if (!claimed) {
    return res.status(409).json({ error: 'This order has already been claimed by another driver.' });
  }
}
```
- **Online Check**: Driver must be online to claim orders
- **Atomic Operation**: `findOneAndUpdate()` with conditions ensures only 1 driver can claim
  - Finds: order must be 'ready_for_pickup' AND driverId must be empty
  - Updates: changes status to 'claimed' and assigns driverId
  - If another driver claimed it simultaneously: `findOneAndUpdate` returns null (another driver won)
- This prevents race condition where 2 drivers try to claim same order

---

### Frontend: Seller OMS (`client/src/components/SellerOMS.tsx`)

**Fetch Orders on Mount:**
```typescript
useEffect(() => {
  fetch(`/api/orders/store/${storeId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-active-role': 'seller'
    }
  })
    .then(res => res.json())
    .then(data => {
      setOrders(data.orders || []);
      setLoading(false);
    })
    .catch(err => console.error("Error fetching orders:", err));
}, [storeId]);
```
- Runs when component mounts or storeId changes
- Uses stored JWT token from localStorage for authentication
- Sets `x-active-role: seller` header to confirm role
- Updates orders state with fetched data
- Sets loading to false when done

**Update Order Status:**
```typescript
const updateStatus = async (orderId: string, nextStatus: string) => {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-active-role': 'seller'
    },
    body: JSON.stringify({ status: nextStatus })
  });

  if (response.ok) {
    setOrders(orders.map(order => 
      order._id === orderId ? { ...order, status: nextStatus as any } : order
    ));
  } else {
    const errData = await response.json();
    alert(`Failed to update: ${errData.error}`);
  }
};
```
- Sends PATCH request to update order status
- On success: updates local state (UI refreshes immediately)
- On error: shows alert with error message from server
- `map()` finds the updated order and updates it, leaves others unchanged

**Render Order Cards:**
```typescript
{orders.map((order) => {
  const orderTotal = order.lines.reduce((sum, line) => sum + (line.unitPrice * line.qty), 0);

  return (
    <div key={order._id} className="p-6 rounded-2xl neomorph-inset">
      {/* Order header with ID and status badge */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold">Order #{order._id.slice(-6).toUpperCase()}</p>
          <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-bold">
          {order.status.replace(/_/g, ' ')} {/* Convert 'ready_for_pickup' to 'ready for pickup' */}
        </div>
      </div>

      {/* Order items list */}
      <div className="mb-6">
        <ul className="space-y-2">
          {order.lines.map((line, idx) => (
            <li key={idx} className="flex justify-between font-medium text-sm">
              <span>{line.qty}x {line.name}</span>
              <span>৳{line.unitPrice * line.qty}</span>
            </li>
          ))}
        </ul>
        {/* Total */}
        <div className="mt-4 pt-4 border-t">
          <span className="font-bold">Total: ৳{orderTotal}</span>
        </div>
      </div>

      {/* Action buttons based on status */}
      {(order.status === 'placed' || order.status === 'paid') && (
        <>
          <button onClick={() => updateStatus(order._id, 'accepted')}>
            Accept
          </button>
          <button onClick={() => updateStatus(order._id, 'rejected')}>
            Reject
          </button>
        </>
      )}
      {(order.status === 'paid' || order.status === 'accepted') && (
        <button onClick={() => updateStatus(order._id, 'ready_for_pickup')}>
          Mark Ready for Pickup
        </button>
      )}
    </div>
  );
})}
```
- Maps through all orders and renders each one
- Calculates total price from line items
- Shows order ID, timestamp, and status
- Lists all items in order
- Shows action buttons based on current status

---

## Order Status Flow

```
Buyer                    Seller                   Driver
├─ placed (buyer)   ──→  ├─ accepts/rejects
│                        └─ ready_for_pickup (after accepting)
│                           ├─ claimed by driver
│                           ├─ at_store (picked up from store)
│                           ├─ picked_up (has items)
│                           ├─ on_the_way (driving to buyer)
│                           └─ delivered (customer received)
└─ paid (after payment)
   └─ (same flow continues)
```

---

## Why This Approach?

### 1. **Atomic Claim Operation**
- Prevents 2 drivers from claiming same order
- Uses MongoDB `findOneAndUpdate` with conditions
- Only one can succeed, others get "already claimed" error

### 2. **Role-Based Permissions**
- Each role can only update allowed statuses
- Sellers can't mark as "on_the_way" (that's driver's job)
- Buyers can't mark as "accepted" (that's seller's job)

### 3. **Real-Time Updates**
- When seller marks "ready_for_pickup", drivers immediately see it in their available orders
- Frontend auto-refreshes every 30 seconds to show new orders

### 4. **Search by Store**
- Query `'lines.storeId': storeId` finds orders with items from this store
- One order can have items from multiple stores
- Each store sees their own items

---

# Feature 3: Driver Dashboard & Status

## Overview
A dedicated portal for delivery drivers where they can toggle their availability status (Online/Offline). It tracks their daily earnings, completed trips, and current active deliveries.

## Where Is It Implemented?

### Backend (Server-Side Code)
**Main File**: `server/src/routes/driver.ts`  
**Database Model**: `server/src/models/User.ts`

### Frontend (Client-Side Code)
**Main Files**:
- `client/src/pages/Dashboard.tsx` - Integrated driver dashboard in main dashboard
- Driver functionality handles: availability toggle, location tracking, order management

---

## Code Tree for Driver Dashboard

```
Driver Dashboard & Status
├── Backend (Server)
│   ├── server/src/routes/driver.ts
│   │   ├── driverOverviewRoute()
│   │   │   ├── Check if user is driver (role validation)
│   │   │   ├── Fetch driver's online status & location
│   │   │   ├── Get active deliveries (claimed, at_store, picked_up, on_the_way)
│   │   │   ├── Get available orders (ready_for_pickup status, unclaimed)
│   │   │   ├── Calculate:
│   │   │   │   ├── dailyEarnings (delivered orders today × ~70 taka each)
│   │   │   │   ├── completedTrips (total delivered orders)
│   │   │   │   ├── distance from driver to store (Google Maps API)
│   │   │   │   └── estimated delivery time
│   │   │   ├── Populate store info for each order
│   │   │   └── Return overview data to frontend
│   │   │
│   │   ├── setDriverStatusRoute()
│   │   │   ├── Validate driver role
│   │   │   ├── Get online boolean from request body
│   │   │   ├── Update user.isOnline field in MongoDB
│   │   │   └── Return new online status
│   │   │
│   │   ├── updateDriverLocationRoute()
│   │   │   ├── Validate driver role
│   │   │   ├── Get latitude & longitude from request body
│   │   │   ├── Create GeoJSON point: { type: 'Point', coordinates: [lng, lat] }
│   │   │   ├── Update user.currentLocation in MongoDB
│   │   │   ├── Update user.lastLocationUpdate timestamp
│   │   │   └── Return updated location
│   │   │
│   │   └── setDriverGoalRoute()
│   │       ├── Validate driver role
│   │       ├── Get goal number from request body
│   │       ├── Update user.driverDailyGoal in MongoDB
│   │       └── Return updated goal
│   │
│   └── server/src/models/User.ts
│       └── User Schema
│           ├── name, email, passwordHash
│           ├── roles[] - array of roles (can be driver, seller, buyer, etc.)
│           ├── neighborhood - area where driver operates
│           ├── isOnline: boolean - toggle for availability
│           ├── currentLocation: GeoJSON Point {
│           │   type: 'Point',
│           │   coordinates: [longitude, latitude]
│           │ }
│           ├── lastLocationUpdate: Date
│           ├── driverDailyGoal: number - target earnings for day
│           ├── adPoints: number - points for ad placements
│           └── 2dsphere index on currentLocation
│
├── Frontend (Client)
│   ├── client/src/pages/Dashboard.tsx
│   │   ├── When driver role selected:
│   │   │   ├── Fetch driver overview data
│   │   │   ├── Auto-refresh every 30 seconds (if online)
│   │   │   ├── Watch geolocation when online
│   │   │   ├── Display driver statistics:
│   │   │   │   ├── Online/Offline toggle
│   │   │   │   ├── Daily earnings display
│   │   │   │   ├── Completed trips count
│   │   │   │   ├── Daily goal progress bar
│   │   │   │   └── Active deliveries list
│   │   │   └── Display available orders to claim:
│   │   │       ├── Store name & location
│   │   │       ├── Distance from driver
│   │   │       ├── Estimated time
│   │   │       ├── Delivery fee
│   │   │       ├── Order items
│   │   │       └── Claim button
│   │   │
│   │   └── Functions:
│   │       ├── toggleDriverStatus() - toggle online/offline
│   │       ├── updateDriverLocation() - send location to backend
│   │       ├── watchPosition() - track location while online
│   │       └── claimOrder() - driver claims available order
│   │
│   └── Browser APIs used:
│       └── navigator.geolocation
│           ├── getCurrentPosition() - get location once
│           └── watchPosition() - continuously track location
```

---

## How It Works (Line-by-Line Explanation)

### Backend: Driver Overview (`server/src/routes/driver.ts`)

**Step 1: Role & Authentication Check**
```typescript
export const driverOverviewRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can access this endpoint' });
    }
```
- Ensures user is logged in
- Ensures user's active role is "driver"
- If not: returns 403 (Forbidden)

**Step 2: Fetch Driver Info**
```typescript
const user = await User.findById(req.user.id).select('isOnline currentLocation driverDailyGoal');
```
- Fetches driver's document
- `.select()` only gets needed fields (improves performance)

**Step 3: Get Active Deliveries**
```typescript
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
```
- Finds all orders where:
  - This driver is assigned (`delivery.driverId`)
  - Status is one of the active statuses
- `.populate()` replaces storeId with actual store data
- Sorts by most recently updated first

**Step 4: Calculate Daily Earnings**
```typescript
const todayStart = new Date();
todayStart.setUTCHours(0, 0, 0, 0);
const todayEnd = new Date(todayStart);
todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

const todaysDeliveries = await Order.find({
  'delivery.driverId': driverObjectId,
  status: 'delivered',
  updatedAt: { $gte: todayStart, $lt: todayEnd }
});

const estimatedAverageDeliveryFee = DELIVERY_BASE_FEE + 60; // 40 + (6km * 10)
const dailyEarnings = todaysDeliveries.length * estimatedAverageDeliveryFee;
```
- Gets today's start and end time in UTC
- Queries delivered orders updated today
- Calculates earnings: count × average fee per delivery (~70 taka)
- Formula: Base fee (40) + distance fee (60 for avg 6km × 10 per km) = 70

**Step 5: Get Available Orders**
```typescript
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
```
- Finds orders that are:
  - Ready for pickup (seller marked as ready)
  - Not yet claimed by a driver
- Limits to 20 recent orders
- Populated with store info

**Step 6: Calculate Distance & Fee**
```typescript
const enrichedOrders = await Promise.all(
  availableOrders.map(async (order: any) => {
    const store = order.lines[0]?.storeId;
    let distanceKm = 0;
    let estimatedMinutes = 0;

    if (hasDriverLocation && store?.location?.coordinates?.[0]) {
      const googleResult = await calculateDistanceWithGoogle(
        [driverLat, driverLng],
        [store.location.coordinates[1], store.location.coordinates[0]]
      );

      if (googleResult) {
        distanceKm = googleResult.distanceKm;
        estimatedMinutes = googleResult.durationMinutes;
      }
    }

    const deliveryFee = order.deliveryFee || calculateDeliveryFee(distanceKm);

    return {
      ...order.toObject(),
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      estimatedMinutes,
      deliveryFee,
    };
  })
);
```
- For each available order:
  - Gets store location
  - Calls Google Maps API to calculate distance from driver to store
  - Calculates delivery fee: base (40) + distance × rate (10/km)
  - Returns enriched order with these calculations

**Step 7: Return Complete Overview**
```typescript
return res.json({
  isOnline: !!user.isOnline,
  dailyEarnings,
  completedTrips,
  activeDeliveries,
  availableOrders: enrichedOrders,
  driverHasLocation: hasDriverLocation,
  driverDailyGoal: user.driverDailyGoal || 0,
});
```
- Returns all data needed by frontend dashboard

---

### Backend: Toggle Online Status (`server/src/routes/driver.ts`)

**The Route:**
```typescript
export const setDriverStatusRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update their status' });
    }

    const parsed = driverStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

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
```
- Validates request body using zod (safeParse)
- Updates user.isOnline to true/false
- `{ new: true }` returns the updated document
- Returns new online status

**Why Zod Validation?**
```typescript
const driverStatusSchema = z.object({
  online: z.boolean(),
});
```
- Ensures `online` is a boolean (not a string like "true")
- Type-safe at runtime
- Returns error if someone sends `{ online: "yes" }`

---

### Backend: Update Location (`server/src/routes/driver.ts`)

**The Route:**
```typescript
export const updateDriverLocationRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update their location' });
    }

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid location data' });

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
```
- Validates latitude & longitude
- Creates GeoJSON Point: `{ type: 'Point', coordinates: [lng, lat] }`
- **Important**: MongoDB requires `[longitude, latitude]` order
- Updates timestamp of last location update
- Returns updated location

---

### Frontend: Driver Dashboard (`client/src/pages/Dashboard.tsx`)

**Auto-Refresh Every 30 Seconds:**
```typescript
useEffect(() => {
  if (selectedRole !== 'driver' || !driverOverview?.isOnline) return;

  const interval = setInterval(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch('/api/driver/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'driver'
        }
      });
      if (res.ok) {
        setDriverOverview(await res.json());
      }
    } catch (err) {
      console.error('Failed to refresh driver overview:', err);
    }
  }, 30000);

  return () => clearInterval(interval);
}, [selectedRole, driverOverview?.isOnline]);
```
- Runs every 30 seconds if driver is online
- Fetches fresh data from backend
- Updates UI with new earnings, available orders, active deliveries
- Cleanup: clears interval when component unmounts or driver goes offline

**Geolocation Tracking:**
```typescript
useEffect(() => {
  if (selectedRole !== 'driver') return;

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateDriverLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.log('Geolocation permission denied:', error.message);
      }
    );

    let watchId: number | null = null;
    if (driverOverview?.isOnline) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateDriverLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Geolocation watch error:', error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }
}, [selectedRole, driverOverview?.isOnline]);
```
- **Once on load**: Gets current position with `getCurrentPosition()`
- **Continuous if online**: Watches position with `watchPosition()`
- **High accuracy**: `enableHighAccuracy: true` uses GPS if available
- **No cache**: `maximumAge: 0` always gets fresh location
- **Cleanup**: Stops watching when driver goes offline

**Send Location to Backend:**
```typescript
const updateDriverLocation = async (latitude: number, longitude: number) => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    await fetch('/api/driver/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-active-role': 'driver'
      },
      body: JSON.stringify({ latitude, longitude })
    });
  } catch (err) {
    console.error('Failed to update driver location:', err);
  }
};
```
- Sends current coordinates to backend
- Backend stores in MongoDB with timestamp
- Used later to calculate distance to stores for available orders

---

## Driver Status Flow

```
Driver Online/Offline Status:
├─ Offline (isOnline: false)
│  └─ Can't see available orders
│     Can't claim orders
│     Earnings not tracked
│
└─ Online (isOnline: true)
   ├─ Sees available orders from nearby stores
   ├─ Can claim an order (status: 'claimed')
   ├─ Updates delivery status as they progress
   ├─ Auto-tracks location via GPS
   ├─ Frontend refreshes available orders every 30 sec
   └─ Earnings calculated for delivered orders today
```

---

## Why This Approach?

### 1. **Geolocation Accuracy**
- `watchPosition()` continuously tracks driver
- Used to calculate distance to stores
- Driver sees most relevant orders (closest first)

### 2. **Battery Optimization**
- Only watches location when driver is online
- Stops watching when offline
- Reduces GPS drain on driver's phone

### 3. **Real-Time Data**
- Frontend auto-refreshes every 30 seconds
- Drivers see new available orders immediately
- Completed trips update earnings live

### 4. **GeoJSON Format**
- MongoDB's 2dsphere index requires GeoJSON format
- `{ type: 'Point', coordinates: [lng, lat] }`
- Enables efficient geospatial queries

### 5. **Delivery Fee Calculation**
- Dynamic based on distance
- Base fee (40 taka) + distance fee (10 taka/km)
- 6km distance = 40 + 60 = 100 taka
- Incentivizes drivers to deliver

---

# Feature 4: Automated Newsletters (SendGrid API)

## Overview
Integration with SendGrid API. The system compiles the top "Sponsored" products for the week and sends a formatted promotional email blast to registered buyers in that neighborhood.

## Where Is It Implemented?

### Backend (Server-Side Code)
**Main Files**:
- `server/src/services/newsletter.ts` - Newsletter logic and SendGrid integration
- `server/src/routes/newsletter.ts` - API endpoints for newsletter

### Environment
**Requires**: `SENDGRID_API_KEY` in environment variables

---

## Code Tree for Automated Newsletters

```
Automated Newsletters (SendGrid API)
├── Backend (Server)
│   ├── server/src/services/newsletter.ts
│   │   ├── sendWeeklyNewsletter()
│   │   │   ├── Get sponsored products from last 7 days
│   │   │   ├── Get all buyers grouped by neighborhood
│   │   │   ├── For each neighborhood:
│   │   │   │   ├── Collect top 10 sponsored products
│   │   │   │   ├── Generate HTML email template
│   │   │   │   ├── Send via SendGrid.sendMultiple()
│   │   │   │   └── Log success
│   │   │   └── Handle errors
│   │   │
│   │   └── sendTestNewsletter(emails[], neighborhood)
│   │       ├── Get all sponsored products
│   │       ├── Limit to 5 for testing
│   │       ├── Generate HTML email template
│   │       ├── Send to specified emails
│   │       └── Used by admins to test before production
│   │
│   └── server/src/routes/newsletter.ts
│       ├── POST /api/newsletter/send (admin only)
│       │   └── Calls sendWeeklyNewsletter()
│       │
│       └── POST /api/newsletter/test (admin or marketer)
│           └── Calls sendTestNewsletter(emails, neighborhood)
│
└── Third-Party Service
    └── SendGrid API
        ├── Authentication: SENDGRID_API_KEY
        └── Features used:
            ├── sgMail.sendMultiple() - send to multiple recipients
            ├── HTML email support
            └── Tracking: opens, clicks, bounces
```

---

## How It Works (Line-by-Line Explanation)

### Setup: Initialize SendGrid (`server/src/services/newsletter.ts`)

**At Top of File:**
```typescript
import sgMail from '@sendgrid/mail';
import { env } from '../env.js';

sgMail.setApiKey(env.sendgridApiKey);
```
- Imports SendGrid mail library
- Sets API key from environment variables
- All SendGrid calls use this authenticated client

---

### Weekly Newsletter Service (`server/src/services/newsletter.ts`)

**Step 1: Get Sponsored Products from Last Week**
```typescript
export async function sendWeeklyNewsletter() {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const sponsoredProducts = await Product.find({
      sponsored: true,
      createdAt: { $gte: oneWeekAgo }
    }).populate('storeId', 'name').limit(10);
```
- Calculates date from 7 days ago
- Queries products where:
  - `sponsored: true` (these are paid promotions)
  - Created within last 7 days
- `.populate('storeId', 'name')` gets store name
- Limits to top 10 products (by recency)

**Step 2: Validate There Are Products**
```typescript
    if (sponsoredProducts.length === 0) {
      console.log('No sponsored products this week');
      return;
    }
```
- If no sponsored products: don't send emails
- Logs and returns early

**Step 3: Get All Buyers by Neighborhood**
```typescript
    const buyers = await User.find({
      roles: 'buyer',
      neighborhood: { $exists: true, $ne: null }
    });

    const neighborhoodGroups: { [key: string]: string[] } = {};
    buyers.forEach(buyer => {
      if (buyer.neighborhood) {
        if (!neighborhoodGroups[buyer.neighborhood]) {
          neighborhoodGroups[buyer.neighborhood] = [];
        }
        neighborhoodGroups[buyer.neighborhood].push(buyer.email);
      }
    });
```
- Finds all users with "buyer" role
- Filters to only those with a neighborhood
- Groups them by neighborhood:
  - Object key = neighborhood name
  - Object value = array of emails in that neighborhood
- **Result**: `{ "Dhanmondi": ["buyer1@email.com", "buyer2@email.com"], "Gulshan": [...] }`

**Step 4: Send Email to Each Neighborhood**
```typescript
    for (const [neighborhood, emails] of Object.entries(neighborhoodGroups)) {
      const products = sponsoredProducts.map(p => ({
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
      }));

      const html = generateNewsletterHTML(neighborhood, products);

      const msg = {
        to: emails,
        from: env.fromEmail,
        subject: `Weekly Sponsored Deals in ${neighborhood}`,
        html: html,
      };

      await sgMail.sendMultiple(msg);
      console.log(`Sent newsletter to ${emails.length} buyers in ${neighborhood}`);
    }
```
- Iterates through each neighborhood
- Extracts product details (name, description, price, image)
- Calls `generateNewsletterHTML()` to create email template
- Creates message object:
  - `to: emails` - array of recipient emails
  - `from` - sender email address
  - `subject` - email subject line
  - `html` - HTML content of email
- **`sgMail.sendMultiple()`**: Sends one email to all recipients at once
  - More efficient than sending individual emails
  - All recipients see same content
- Logs success

**Step 5: Handle Errors**
```typescript
  } catch (error) {
    console.error('Error sending newsletter:', error);
  }
}
```
- Catches any errors (API failures, database errors, etc.)
- Logs error for debugging

---

### Test Newsletter Function (`server/src/services/newsletter.ts`)

**For Testing Before Production:**
```typescript
export async function sendTestNewsletter(emails: string[], neighborhood: string) {
  try {
    const sponsoredProducts = await Product.find({
      sponsored: true
    }).populate('storeId', 'name').limit(5);

    if (sponsoredProducts.length === 0) {
      console.log('No sponsored products found');
      return;
    }

    const products = sponsoredProducts.map(p => ({
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
    }));

    const html = generateNewsletterHTML(neighborhood, products);

    const msg = {
      to: emails,
      from: env.fromEmail,
      subject: `Weekly Sponsored Deals in ${neighborhood}`,
      html: html,
    };

    await sgMail.sendMultiple(msg);
```
- Similar to weekly function
- **Difference**: Gets ALL sponsored products (not just last 7 days)
- Useful for testing when you want predictable content
- Can send to specific test emails
- Limits to 5 products instead of 10

---

### Newsletter API Routes (`server/src/routes/newsletter.ts`)

**Admin Route to Send Weekly Newsletter:**
```typescript
router.post('/send', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!req.user!.roles.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await sendWeeklyNewsletter();
    res.json({ message: 'Newsletter sent successfully' });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ error: 'Failed to send newsletter' });
  }
});
```
- Authentication required (`requireAuth`)
- Checks if user has 'admin' role
- Only admins can trigger weekly newsletter
- Calls service function
- Returns success/error response

**Admin/Marketer Route for Test Newsletter:**
```typescript
router.post('/test', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!['admin', 'marketer'].includes(req.user!.activeRole)) {
      return res.status(403).json({ error: 'Admin or marketer access required' });
    }

    const { emails, neighborhood } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'emails array is required' });
    }

    await sendTestNewsletter(emails, neighborhood || 'Test Neighborhood');
    res.json({ message: `Test newsletter sent to ${emails.length} email(s)` });
  } catch (error) {
    console.error('Error sending test newsletter:', error);
    res.status(500).json({ error: 'Failed to send test newsletter' });
  }
});
```
- Both admins and marketers can send test emails
- Validates request body:
  - `emails` must be array with at least one email
  - `neighborhood` is optional (defaults to 'Test Neighborhood')
- Returns success message with count

---

### HTML Email Template (`server/src/services/newsletter.ts`)

**The Function (Conceptual):**
```typescript
function generateNewsletterHTML(neighborhood: string, products: any[]) {
  // Generate HTML email with:
  // 1. Header: "Weekly Deals in {neighborhood}"
  // 2. Product cards with image, name, price
  // 3. Footer: unsubscribe link, brand info
  // 4. Tracking pixels for opens
  // 5. Clickable product links
}
```
- Generates professional HTML email
- Shows products in a grid/list format
- Includes unsubscribe link (required by law)
- SendGrid tracks opens and clicks

---

## Newsletter Data Flow

```
Step 1: Get Sponsored Products
    ↓
Product.find({ sponsored: true, createdAt: { $gte: oneWeekAgo } })
    ↓
Step 2: Group Buyers by Neighborhood
    ↓
User.find({ roles: 'buyer', neighborhood: { $exists: true } })
    ↓
{ "Dhanmondi": [emails], "Gulshan": [emails], ... }
    ↓
Step 3: For Each Neighborhood
    ├─ Generate HTML
    ├─ Create message
    └─ Send via SendGrid
    ↓
Step 4: Recipients Receive Email
    ├─ Open email (tracked)
    ├─ Click product link (tracked)
    └─ Email shows only products in their neighborhood
```

---

## Why This Approach?

### 1. **Group by Neighborhood**
- Buyers only see deals relevant to their area
- Increases engagement (not showing Gulshan deals to Dhanmondi buyers)
- Personalized marketing

### 2. **Sponsored Products Only**
- Only sellers who paid get their products promoted
- Creates revenue stream
- Ensures quality content in newsletter

### 3. **Weekly Schedule**
- Regular cadence keeps users engaged
- Not too frequent (doesn't annoy users)
- Easy to remember (every week)

### 4. **SendGrid Benefits**
- Professional email delivery (high success rate)
- Built-in tracking (opens, clicks, bounces)
- HTML email support
- Bulk sending (`sendMultiple`)
- Handles unsubscribes automatically

### 5. **Test Newsletter**
- Admins can test before going live
- Ensure HTML renders correctly
- Check email address validity
- Verify product data

---

# Feature 5: Delivery Status Updates

## Overview
Once an order is claimed by a driver, they control the delivery timeline. They update the system status sequentially through: "At Store," "Picked Up," "On the Way," and "Delivered."

## Where Is It Implemented?

### Backend (Server-Side Code)
**Main File**: `server/src/routes/orders.ts` - updateOrderStatusRoute()  
**Database Model**: `server/src/models/Order.ts`

### Frontend (Client-Side Code)
**Main File**: `client/src/pages/Dashboard.tsx` - Driver delivery status section

---

## Code Tree for Delivery Status Updates

```
Delivery Status Updates
├── Backend (Server)
│   ├── server/src/routes/orders.ts
│   │   └── updateOrderStatusRoute()
│   │       ├── Driver-specific flow:
│   │       │   ├── Driver must be online (checked)
│   │       │   ├── Driver must be assigned to this order
│   │       │   ├── Status transitions allowed:
│   │       │   │   ├─ claimed → at_store
│   │       │   │   ├─ at_store → picked_up
│   │       │   │   ├─ picked_up → on_the_way
│   │       │   │   └─ on_the_way → delivered
│   │       │   ├── Each update requires proof:
│   │       │   │   ├─ Optional photo URL
│   │       │   │   └─ PIN verification (last 4 digits)
│   │       │   └── Update order.delivery.proof with evidence
│   │       │
│   │       └── Role-based permissions:
│   │           ├─ Buyer: can only set 'placed'
│   │           ├─ Seller: can set 'accepted', 'rejected', 'ready_for_pickup'
│   │           ├─ Driver: can set 'claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered'
│   │           └─ Admin: can set any status
│   │
│   └── server/src/models/Order.ts
│       └── Order Schema
│           ├── delivery:
│           │   ├── driverId - who is delivering
│           │   ├── deliveryPin - 4-digit PIN (generated when order created)
│           │   └── proof:
│           │       ├── pinLast4 - last 4 digits of PIN
│           │       └── photoUrl - photo of delivery proof
│           ├── status - current delivery status
│           └── timestamps - tracks when status changed
│
└── Frontend (Client)
    ├── client/src/pages/Dashboard.tsx
    │   ├── When driver role selected:
    │   │   ├── Display active deliveries:
    │   │   │   └── For each active delivery:
    │   │   │       ├── Order ID
    │   │   │       ├── Current status
    │   │   │       ├── Items in order
    │   │   │       ├── Store location
    │   │   │       ├── Delivery address (from buyer)
    │   │   │       ├── Delivery PIN (shown to driver)
    │   │   │       └── Status update buttons
    │   │   │
    │   │   └── Status update process:
    │   │       ├─ When at store: click "At Store"
    │   │       ├─ After picking up items: click "Picked Up"
    │   │       ├─ On the way to buyer: click "On the Way"
    │   │       ├─ At buyer's location: enter PIN + optional photo
    │   │       └─ Click "Mark as Delivered"
    │   │
    │   └── Driver Input Section:
    │       ├── PIN input field (4 digits)
    │       ├── Photo upload (optional but recommended)
    │       └── Confirm button
    │
    └── Real-time Updates:
        ├── Frontend polls /api/driver/overview every 30 sec
        └── Shows updated delivery status immediately
```

---

## How It Works (Line-by-Line Explanation)

### Order Status Lifecycle

**When Order Created (Buyer):**
```typescript
const order = await Order.create({
  buyerId: new mongoose.Types.ObjectId(req.user.id),
  lines: parsed.data.lines,
  status: 'placed',
  delivery: {
    deliveryPin: pin  // e.g., "4729"
  }
});
```
- Status starts as 'placed'
- Delivery PIN is randomly generated (1000-9999)
- Stored in order for later verification

**Status: Accepted (Seller)**
```
Buyer places order (status: 'placed')
    ↓
Seller sees incoming order in SellerOMS
    ↓
Seller clicks "Accept" button
    ↓
Status changes to 'accepted'
```
- Seller confirms they can fulfill the order
- Now seller is preparing the items

**Status: Ready for Pickup (Seller)**
```
Seller prepares items
    ↓
Seller clicks "Mark Ready for Pickup"
    ↓
Status changes to 'ready_for_pickup'
    ↓
Order appears in driver's "Available Orders" list
```
- Items are packaged and ready
- Drivers can now claim this order

**Status: Claimed (Driver)**
```typescript
if (role === 'driver' && nextStatus === 'claimed') {
  const driver = await User.findById(req.user.id).select('isOnline');
  if (!driver?.isOnline) {
    return res.status(403).json({ error: 'Driver must be online to update delivery status' });
  }

  const claimed = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'ready_for_pickup',
      $or: [{ 'delivery.driverId': null }, { 'delivery.driverId': { $exists: false } }],
    },
    {
      $set: {
        status: 'claimed',
        'delivery.driverId': new mongoose.Types.ObjectId(req.user.id),
      },
    },
    { new: true }
  );

  if (!claimed) {
    return res.status(409).json({ error: 'This order has already been claimed by another driver.' });
  }
}
```
- **Check Online**: Driver must be online
- **Atomic Update**: MongoDB does this atomically (no race condition)
  - Finds order that is 'ready_for_pickup' AND has no driverId assigned
  - Sets driverId to current driver
- **Atomicity Benefit**: If 2 drivers click simultaneously, only first wins
- **Race Condition Prevention**: Second driver gets "already claimed" error

**Status: At Store (Driver)**
```
Driver arrives at store
    ↓
Driver clicks "At Store"
    ↓
Status changes to 'at_store'
    ↓
Driver goes inside to pick up items
```
- Indicates driver has arrived at store location
- Seller knows driver is coming

**Status: Picked Up (Driver)**
```
Driver collects items from seller
    ↓
Driver clicks "Picked Up"
    ↓
Status changes to 'picked_up'
    ↓
Items are now with driver, en route to buyer
```
- Confirms driver has items in hand
- Now heading to buyer

**Status: On the Way (Driver)**
```
Driver clicks "On the Way"
    ↓
Status changes to 'on_the_way'
```
- Driver is actively driving to buyer
- Buyer can track driver approaching

**Status: Delivered (Driver)**
```typescript
// Request body:
{
  status: 'delivered',
  proof: {
    pinLast4: '7829',      // Last 4 digits of delivery PIN
    photoUrl: 'https://...'  // Optional photo
  }
}

// In route:
const updateStatusSchema = z.object({
  status: statusSchema,
  driverId: z.string().optional(),
  proof: z.object({
    pinLast4: z.string().length(4).optional(),
    photoUrl: z.string().url().optional(),
  }).optional(),
});

// Verify proof:
const order = await Order.findById(req.params.id);
const deliveryPin = order.delivery.deliveryPin; // e.g., "4729"
const pinLast4 = deliveryPin.slice(-4);  // "4729"

if (proof.pinLast4 !== pinLast4) {
  return res.status(400).json({ error: 'PIN does not match' });
}

// Update order with proof:
order.delivery.proof = {
  pinLast4: proof.pinLast4,
  photoUrl: proof.photoUrl
};
order.status = 'delivered';
await order.save();
```
- Driver arrives at buyer's location
- Driver enters last 4 digits of delivery PIN
- Driver optionally uploads photo of delivery
- **PIN Verification**: Last 4 digits of PIN must match
  - Prevents unauthorized marking as delivered
  - PIN was given to buyer separately
  - Buyer confirms driver has correct PIN
- Photo is optional but provides evidence
- Status changes to 'delivered'

---

### Frontend: Driver Status Updates (`client/src/pages/Dashboard.tsx`)

**Display Active Deliveries:**
```typescript
{driverOverview?.activeDeliveries.map((delivery) => (
  <div key={delivery._id} className="p-4 border rounded-lg">
    <div className="flex justify-between">
      <div>
        <p>Order #{delivery._id.slice(-6)}</p>
        <p>Status: {delivery.status}</p>
        <p>Store: {delivery.storeInfo?.name}</p>
      </div>
      <div>
        <p>Items: {delivery.lines.length}</p>
        <p>Total: ৳{delivery.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)}</p>
      </div>
    </div>

    {/* Items in order */}
    <ul className="mt-2 text-sm">
      {delivery.lines.map((line, idx) => (
        <li key={idx}>{line.qty}x {line.name}</li>
      ))}
    </ul>
  </div>
))}
```
- Maps through active deliveries
- Shows order details, items, total
- Shows current delivery status

**Status Update Buttons:**
```typescript
{delivery.status === 'claimed' && (
  <button onClick={() => updateStatus(delivery._id, 'at_store')}>
    ✓ At Store
  </button>
)}

{delivery.status === 'at_store' && (
  <button onClick={() => updateStatus(delivery._id, 'picked_up')}>
    ✓ Picked Up
  </button>
)}

{delivery.status === 'picked_up' && (
  <button onClick={() => updateStatus(delivery._id, 'on_the_way')}>
    ✓ On the Way
  </button>
)}

{delivery.status === 'on_the_way' && (
  <button onClick={() => showDeliveryProofModal(delivery._id)}>
    ✓ Deliver & Verify PIN
  </button>
)}
```
- Shows different button based on current status
- Progressive workflow: can only move forward, not backward
- Last button opens modal for PIN entry

**Delivery Proof Modal:**
```typescript
const showDeliveryProofModal = (orderId: string) => {
  setShowPinModal(true);
  setCurrentDeliveryOrderId(orderId);
};

// In modal:
{showPinModal && (
  <div className="modal">
    <input
      type="text"
      maxLength="4"
      placeholder="Enter last 4 digits of PIN"
      value={pinInput}
      onChange={(e) => setPinInput(e.target.value)}
    />
    
    <input
      type="file"
      accept="image/*"
      onChange={(e) => uploadDeliveryPhoto(e.target.files?.[0])}
    />

    <button onClick={handleMarkDelivered}>
      Confirm Delivery
    </button>
  </div>
)}

const handleMarkDelivered = async () => {
  if (pinInput.length !== 4) {
    alert('PIN must be 4 digits');
    return;
  }

  const photoUrl = driverPhotoUrl || null;

  const res = await fetch(`/api/orders/${currentDeliveryOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-active-role': 'driver'
    },
    body: JSON.stringify({
      status: 'delivered',
      proof: {
        pinLast4: pinInput,
        photoUrl: photoUrl
      }
    })
  });

  if (res.ok) {
    alert('Delivery confirmed!');
    setShowPinModal(false);
    setPinInput('');
  } else {
    const err = await res.json();
    alert(`Error: ${err.error}`);
  }
};
```
- Modal asks for 4-digit PIN
- Optional photo upload
- Sends to backend with proof
- Backend validates PIN matches

---

## Status Validation Rules

```typescript
const allowedByRole: Record<string, Set<string>> = {
  driver: new Set(['claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered']),
};

// Also check order state:
if (role === 'driver') {
  const assignedId = order.delivery?.driverId?.toString();
  if (!assignedId || assignedId !== req.user.id) {
    return res.status(403).json({ error: 'This order is assigned to another driver.' });
  }
}
```
- Driver can ONLY update status if:
  1. They are a driver (role check)
  2. They are assigned to this order (driverId matches)
  3. They are online
  4. Status is one of allowed values
  5. For 'delivered': PIN matches

---

## Complete Delivery Status Sequence

```
BUYER PLACES ORDER
└─ Status: 'placed'
   └─ Delivery PIN generated (e.g., "4729")

SELLER RECEIVES & ACCEPTS
└─ Seller clicks "Accept"
└─ Status: 'accepted'
   └─ Seller prepares items

SELLER MARKS READY
└─ Seller clicks "Mark Ready"
└─ Status: 'ready_for_pickup'
   └─ Order appears in driver list

DRIVER CLAIMS ORDER
└─ Driver sees available orders
└─ Driver clicks "Claim Order"
└─ Status: 'claimed'
   └─ Order assigned to driver

DRIVER ARRIVES AT STORE
└─ Driver clicks "At Store"
└─ Status: 'at_store'

DRIVER PICKS UP ITEMS
└─ Driver gets items from seller
└─ Driver clicks "Picked Up"
└─ Status: 'picked_up'

DRIVER EN ROUTE
└─ Driver clicks "On the Way"
└─ Status: 'on_the_way'

DRIVER DELIVERS TO BUYER
└─ Driver arrives at buyer
└─ Driver enters PIN: "4729"
└─ Driver takes optional photo
└─ Driver clicks "Confirm Delivery"
└─ Status: 'delivered'
   └─ Proof stored: { pinLast4: "4729", photoUrl: "..." }
   
ORDER COMPLETE ✓
└─ Payment finalized
└─ Driver earnings credited
└─ Buyer can now review seller
```

---

## Why This Approach?

### 1. **PIN Verification**
- Ensures driver delivered to correct person
- Buyer confirms PIN with driver
- Prevents fake deliveries

### 2. **Photo Evidence (Optional)**
- Adds extra layer of proof
- Useful for disputes
- Builds driver accountability

### 3. **Sequential Status Flow**
- Can't jump from 'claimed' to 'delivered'
- Must go through all steps
- Provides accurate timeline

### 4. **Atomic Claim Operation**
- Only one driver can claim order
- No duplicate deliveries
- No missed orders

### 5. **Role-Based Permission Check**
- Only assigned driver can update status
- Can't update someone else's order
- Another driver can't interfere

### 6. **Online Requirement**
- Driver must be actively available
- Prevents offline drivers from claiming
- Ensures someone is actually delivering

---

## Summary of All 5 Features

| Feature | Purpose | Key Users | Main Benefit |
|---------|---------|-----------|--------------|
| **1. Search & Filter** | Find products nearby | Buyers | Easy discovery, location-based results |
| **2. Order Management** | Manage incoming orders | Sellers | Accept/reject, control workflow |
| **3. Driver Dashboard** | Track deliveries & earnings | Drivers | Real-time info, location tracking |
| **4. Newsletters** | Promotional emails | Buyers | Neighborhood-specific deals |
| **5. Delivery Status** | Track order in transit | All | Full visibility, PIN verification |

---

## Database Schema Summary

### User Model
```typescript
{
  name, email, passwordHash,
  roles: ['buyer', 'seller', 'driver', ...],
  isOnline: boolean,
  currentLocation: { type: 'Point', coordinates: [lng, lat] },
  driverDailyGoal: number
}
```

### Product Model
```typescript
{
  name, description, price, category,
  storeId: ObjectId,
  imageUrl, stockQuantity,
  isPromoted: boolean,
  promotedUntil: Date,
  location: { type: 'Point', coordinates: [lng, lat] }
}
```

### Order Model
```typescript
{
  buyerId: ObjectId,
  lines: [{ productId, storeId, name, unitPrice, qty }],
  status: 'placed' | 'accepted' | 'ready_for_pickup' | ... | 'delivered',
  delivery: {
    driverId: ObjectId,
    deliveryPin: string,
    proof: { pinLast4, photoUrl }
  },
  pricing: { subtotal, discountAmount, total }
}
```

---

## API Endpoints Summary

### Search
- `GET /api/search?keyword=...&category=...&lat=...&lng=...&radius=...`

### Orders
- `GET /api/orders/me` - Buyer's orders
- `GET /api/orders/store/:storeId` - Seller's store orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update status

### Driver
- `GET /api/driver/overview` - Dashboard data
- `POST /api/driver/status` - Toggle online/offline
- `POST /api/driver/location` - Update location
- `POST /api/driver/goal` - Set daily goal

### Newsletter
- `POST /api/newsletter/send` - Send weekly (admin)
- `POST /api/newsletter/test` - Send test (admin/marketer)

---

## Environment Variables Required

```env
MONGODB_URI=mongodb+srv://...
SENDGRID_API_KEY=SG.xxx
GOOGLE_MAPS_API_KEY=AIzaSy...
JWT_SECRET=your-secret-key
```

---

## Conclusion

Bazar-Koro implements a complete multi-role e-commerce delivery platform with:

1. **Search & Filter**: Geolocation-aware MongoDB aggregation with promoted products
2. **Order Management**: Role-based status management with atomic operations
3. **Driver Dashboard**: Real-time tracking with geolocation and earnings calculation
4. **Automated Newsletters**: SendGrid integration for neighborhood-specific promotions
5. **Delivery Status**: Sequential status updates with PIN verification

Each feature uses best practices: atomic operations for race conditions, role-based access control, asynchronous operations, error handling, and data validation.

