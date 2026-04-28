# Live Modification Task: Exam Cheat Sheet & Procedure Guide

**For**: Bazar-Koro Live Modification Viva Exam  
**Purpose**: Step-by-step guide to safely modify features during exam  
**Date**: 2026

---

## Table of Contents
1. [General Approach](#general-approach)
2. [Safety Checklist](#safety-checklist)
3. [Feature-Specific Modifications](#feature-specific-modifications)
4. [Common Modification Requests](#common-modification-requests)
5. [Testing Procedures](#testing-procedures)
6. [Error Handling During Exam](#error-handling-during-exam)
7. [Git & Deployment](#git--deployment)
8. [Quick Reference Commands](#quick-reference-commands)

---

# General Approach

## When Examiner Says: "Modify Feature X"

### STEP 1: UNDERSTAND THE REQUEST (5 min)
```
┌─ Listen carefully ──────────────────────────────────────────┐
│                                                              │
│ Ask clarifying questions:                                   │
│  • "Should this affect existing data?"                       │
│  • "Does this change the API response?"                      │
│  • "Should this be frontend, backend, or both?"             │
│  • "Any performance considerations?"                         │
│  • "Should this work for all users or specific roles?"      │
│                                                              │
│ Take notes of requirement                                   │
│ Draw quick diagram if needed                                │
└──────────────────────────────────────────────────────────────┘
```

### STEP 2: PLAN YOUR CHANGES (5 min)
```
┌─ Identify affected files ──────────────────────────────────┐
│                                                             │
│ Frontend changes?                                           │
│  ├─ client/src/pages/*.tsx                                 │
│  ├─ client/src/components/*.tsx                            │
│  └─ client/src/hooks/*.ts                                  │
│                                                             │
│ Backend changes?                                            │
│  ├─ server/src/routes/*.ts                                 │
│  ├─ server/src/models/*.ts                                 │
│  ├─ server/src/services/*.ts                               │
│  └─ server/src/middleware/*.ts                             │
│                                                             │
│ Database schema changes?                                    │
│  └─ Modify model interface & schema                         │
│                                                             │
│ Write down 3-5 files you'll modify                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### STEP 3: BACKUP CURRENT STATE (2 min)
```bash
# Create a backup branch
git checkout -b backup/before-modification

# Or just note the current state
git status
```

### STEP 4: MAKE CHANGES (20-30 min)
- Modify identified files
- Add error handling
- Update types/interfaces
- Test as you go

### STEP 5: TEST THOROUGHLY (10 min)
- Test in browser/Postman
- Check error cases
- Verify database changes

### STEP 6: COMMIT & DEMONSTRATE (5 min)
```bash
git add .
git commit -m "feat: [feature name] - [description of change]"
git log --oneline -5  # Show your commit
```

---

# Safety Checklist

## Before You Start Modifying
```
☐ Git status is clean (git status)
☐ You're on correct branch (git branch)
☐ Backup branch created (optional but recommended)
☐ Backend server NOT running yet
☐ Frontend development server NOT running yet
☐ Database backup exists or is not critical
☐ You understand the requirement clearly
☐ You have the files open in VS Code
```

## During Modification
```
☐ Compile TypeScript (check for errors)
☐ Save all files
☐ No syntax errors in IDE
☐ Proper error handling added
☐ Type safety maintained
☐ Database schema updated correctly
```

## After Modification
```
☐ Backend compiles without errors
☐ Frontend compiles without errors
☐ Start backend server (npm start or yarn start)
☐ Start frontend server (npm run dev)
☐ Test in browser
☐ Test API with Postman/curl
☐ Check browser console for errors
☐ Check server logs for errors
☐ Git diff looks correct (git diff)
☐ Ready to demonstrate
```

---

# Feature-Specific Modifications

## Feature 1: Search & Filter Engine

### Common Modification: Add New Filter Type

**Requirement**: "Add distance-based sorting (closest first)"

#### STEP 1: Identify Files
```
Frontend:
  ├─ client/src/components/SearchFilters.tsx (add sort dropdown)
  └─ client/src/hooks/useSearch.ts (pass sort param to API)

Backend:
  ├─ server/src/routes/search.ts (handle sort param in pipeline)
  └─ Types: client/src/types/search.ts (update interface)
```

#### STEP 2: Modify Backend (`server/src/routes/search.ts`)

**Find this section:**
```typescript
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
```

**Replace with:**
```typescript
// 3. Calculate Total Documents (for Pagination) before applying skip/limit
const countPipeline = [...pipeline, { $count: 'total' }];
const countResult = await Product.aggregate(countPipeline);
const total = countResult[0]?.total || 0;

// ✅ 3.5. SORT BY PROMOTION STATUS FIRST (promoted products to the top), then by creation date or distance
const sortStage: any = {};

// Check if user wants distance-based sorting
if (req.query.sortByDistance === 'true' && lat && lng) {
  sortStage.distance = 1;  // Closest first
  sortStage.isCurrentlyPromoted = -1;  // But promoted still on top
} else {
  sortStage.isCurrentlyPromoted = -1;
  sortStage.createdAt = -1;
}

pipeline.push({ $sort: sortStage });
```

#### STEP 3: Modify Frontend (`client/src/components/SearchFilters.tsx`)

**Add to filter form (around the radius input):**
```typescript
// Add this state at top with other states:
const [sortByDistance, setSortByDistance] = useState(false);

// Add this inside the form JSX:
<div>
  <label className="block text-sm font-medium text-[#646657] mb-1">Sort</label>
  <select
    value={sortByDistance ? 'distance' : 'relevant'}
    onChange={(e) => setSortByDistance(e.target.value === 'distance')}
    className="w-full px-4 py-2 rounded-xl neomorph-inset bg-[#e8eaf0] focus:outline-none"
  >
    <option value="relevant">Most Relevant</option>
    <option value="distance">Closest First</option>
  </select>
</div>

// Modify triggerSearch to include sortByDistance:
const triggerSearch = (searchKeyword: string, searchLat = lat, searchLng = lng) => {
  onSearch({
    keyword: searchKeyword,
    category: category || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    radius: radius ? Number(radius) : undefined,
    lat: searchLat,
    lng: searchLng,
    sortByDistance: sortByDistance,  // ← ADD THIS
    page: 1,
    limit: 10,
  });
};
```

#### STEP 4: Update Hook (`client/src/hooks/useSearch.ts`)

**Find the query building section:**
```typescript
const query = new URLSearchParams();
if (params.keyword) query.append('keyword', params.keyword);
if (params.category) query.append('category', params.category);
if (params.minPrice !== undefined) query.append('minPrice', String(params.minPrice));
if (params.maxPrice !== undefined) query.append('maxPrice', String(params.maxPrice));
if (params.lat !== undefined) query.append('lat', String(params.lat));
if (params.lng !== undefined) query.append('lng', String(params.lng));
if (params.radius !== undefined) query.append('radius', String(params.radius));
```

**Add after radius:**
```typescript
if (params.sortByDistance !== undefined) query.append('sortByDistance', String(params.sortByDistance));
```

#### STEP 5: Test
```bash
# In browser:
1. Search for products
2. Select "Closest First" from sort dropdown
3. Verify products are sorted by distance (closest at top)
4. Check that promoted products still appear first if applicable
```

---

### Common Modification: Add Category Filter Display

**Requirement**: "Show available categories with count"

#### Steps:
1. **Backend** (`server/src/routes/search.ts`):
   ```typescript
   // Add new route for categories
   export const getCategoriesRoute = async (req: Request, res: Response) => {
     try {
       const categories = await Product.distinct('category');
       const counts = await Product.aggregate([
         { $group: { _id: '$category', count: { $sum: 1 } } }
       ]);
       res.json({ categories: counts });
     } catch (error) {
       res.status(500).json({ error: 'Failed to fetch categories' });
     }
   };
   ```

2. **Frontend** (`client/src/components/SearchFilters.tsx`):
   ```typescript
   // Fetch categories on mount
   useEffect(() => {
     fetch('/api/search/categories')
       .then(res => res.json())
       .then(data => setCategoryOptions(data.categories))
       .catch(err => console.error("Failed to load categories", err));
   }, []);

   // Use in select dropdown with counts
   <select value={category}>
     {categoryOptions.map(cat => (
       <option key={cat._id} value={cat._id}>
         {cat._id} ({cat.count})
       </option>
     ))}
   </select>
   ```

---

## Feature 2: Order Management System (OMS)

### Common Modification: Auto-Update Order Status After Payment

**Requirement**: "When payment is received, automatically mark order as 'paid'"

#### STEP 1: Identify Files
```
Backend:
  ├─ server/src/routes/payment.ts (trigger status update)
  ├─ server/src/routes/orders.ts (update status logic)
  └─ server/src/models/Order.ts (no changes needed)
```

#### STEP 2: Modify Payment Route (`server/src/routes/payment.ts`)

**Find the payment success webhook handler:**
```typescript
// Existing code
const handlePaymentSuccess = async (paymentId: string) => {
  // Payment processing logic
};
```

**Add order status update:**
```typescript
const handlePaymentSuccess = async (paymentId: string) => {
  try {
    // Find order by paymentId
    const order = await Order.findOne({ paymentId: paymentId });
    
    if (order) {
      // Update order status to 'paid'
      order.status = 'paid';
      await order.save();
      
      console.log(`Order ${order._id} marked as paid`);
      
      // Optional: Send notification to seller
      // await notificationService.notifySeller(order.buyerId, "Payment received");
    }
  } catch (error) {
    console.error('Failed to update order status after payment:', error);
  }
};
```

#### STEP 3: Test
```
1. Place an order (status: 'placed')
2. Complete payment flow
3. Check Order in MongoDB Compass (should be 'paid')
4. Seller should see order in OMS with 'paid' status
```

---

### Common Modification: Add Order Cancellation Feature

**Requirement**: "Allow buyers to cancel orders within 5 minutes of creation"

#### STEP 1: Add Cancellation Route (`server/src/routes/orders.ts`)

```typescript
export const cancelOrderRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'buyer') {
      return res.status(403).json({ error: 'Only buyers can cancel orders' });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Check if buyer owns this order
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not your order' });
    }

    // Check if order is within 5 minutes
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesElapsed > 5) {
      return res.status(400).json({ error: 'Can only cancel within 5 minutes' });
    }

    // Check if order hasn't been accepted yet
    if (order.status !== 'placed' && order.status !== 'paid') {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    // Cancel order
    order.status = 'cancelled';
    await order.save();

    return res.json({ order, message: 'Order cancelled successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
};
```

#### STEP 2: Add to Order Model Interface

**Modify `server/src/models/Order.ts`:**
```typescript
const orderSchema = new mongoose.Schema({
  // ... existing fields ...
  status: {
    type: String,
    enum: ['placed', 'paid', 'accepted', 'rejected', 'ready_for_pickup', 'claimed', 'at_store', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],  // ← ADD 'cancelled'
    default: 'placed'
  },
  // ... rest of schema ...
});
```

#### STEP 3: Add Frontend Button (`client/src/pages/Dashboard.tsx`)

```typescript
// In buyer orders list:
{buyerOrder.status === 'placed' && (
  <button
    onClick={() => cancelOrder(buyerOrder._id)}
    className="text-red-500 font-bold underline"
  >
    Cancel Order
  </button>
)}

// Cancel function:
const cancelOrder = async (orderId: string) => {
  if (!confirm('Cancel this order?')) return;
  
  try {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-active-role': 'buyer'
      }
    });

    if (res.ok) {
      alert('Order cancelled');
      // Refresh orders
      fetchUserData();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  } catch (err) {
    alert('Failed to cancel order');
  }
};
```

#### STEP 4: Test
```
1. Place order
2. Within 5 minutes: Cancel order → Should succeed
3. After 5 minutes: Try to cancel → Should show error
4. After seller accepts: Try to cancel → Should show error
```

---

## Feature 3: Driver Dashboard & Status

### Common Modification: Add Daily Goal Progress Notification

**Requirement**: "Show alert when driver reaches daily goal"

#### STEP 1: Modify Backend (`server/src/routes/driver.ts`)

**Find the part that calculates daily earnings:**
```typescript
const estimatedAverageDeliveryFee = DELIVERY_BASE_FEE + 60;
const dailyEarnings = todaysDeliveries.length * estimatedAverageDeliveryFee;
```

**Add goal check:**
```typescript
const estimatedAverageDeliveryFee = DELIVERY_BASE_FEE + 60;
const dailyEarnings = todaysDeliveries.length * estimatedAverageDeliveryFee;

// Check if goal reached
const driverGoal = user.driverDailyGoal || 0;
const goalReached = driverEarnings >= driverGoal && driverGoal > 0;

// Return this flag too
return res.json({
  isOnline: !!user.isOnline,
  dailyEarnings,
  completedTrips,
  activeDeliveries,
  availableOrders: enrichedOrders,
  driverHasLocation: hasDriverLocation,
  driverDailyGoal: user.driverDailyGoal || 0,
  goalReached: goalReached  // ← ADD THIS
});
```

#### STEP 2: Modify Frontend (`client/src/pages/Dashboard.tsx`)

```typescript
// In driver overview display:
{driverOverview?.goalReached && (
  <div className="bg-green-200 border-2 border-green-500 rounded-xl p-4 mb-4 text-center font-bold text-green-800">
    🎉 Congratulations! You've reached your daily goal!
  </div>
)}
```

#### STEP 3: Test
```
1. Set driver goal to small amount (e.g., 100 taka)
2. Complete delivery worth goal amount
3. Should see congratulations message
```

---

### Common Modification: Add "Pause" Feature

**Requirement**: "Allow drivers to pause availability without going offline"

#### STEP 1: Add to User Model (`server/src/models/User.ts`)

```typescript
export interface IUser {
  // ... existing fields ...
  isOnline?: boolean;
  isPaused?: boolean;        // ← ADD THIS
  pausedUntil?: Date;        // ← ADD THIS (until when paused)
  // ... rest ...
}

const userSchema = new mongoose.Schema<IUser>(
  {
    // ... existing fields ...
    isOnline: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },        // ← ADD THIS
    pausedUntil: { type: Date, default: null },        // ← ADD THIS
    // ... rest ...
  }
);
```

#### STEP 2: Add Pause Route (`server/src/routes/driver.ts`)

```typescript
export const pauseDriverRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can pause' });
    }

    const { minutes } = req.body;  // e.g., pause for 15 minutes
    
    if (!minutes || minutes < 1 || minutes > 120) {
      return res.status(400).json({ error: 'Pause duration must be 1-120 minutes' });
    }

    const pausedUntil = new Date(Date.now() + minutes * 60 * 1000);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        isPaused: true,
        pausedUntil: pausedUntil
      },
      { new: true }
    ).select('isPaused pausedUntil');

    return res.json({
      isPaused: true,
      pausedUntil: pausedUntil,
      message: `Paused for ${minutes} minutes`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to pause' });
  }
};
```

#### STEP 3: Modify Overview Route

**In `driverOverviewRoute()`, filter out paused drivers from available orders:**

```typescript
// Check if driver is paused
const isPaused = user.isPaused && user.pausedUntil && user.pausedUntil > new Date();

// Unpause if time elapsed
if (isPaused && user.pausedUntil <= new Date()) {
  user.isPaused = false;
  user.pausedUntil = null;
  await user.save();
}

// Don't show available orders if paused
const availableOrders = isPaused ? [] : await Order.find({...});
```

#### STEP 4: Test
```
1. Driver goes online
2. Click "Pause" button for 15 minutes
3. Should not see available orders during pause
4. After 15 minutes, orders should appear again
```

---

## Feature 4: Automated Newsletters

### Common Modification: Add Unsubscribe Link That Actually Works

**Requirement**: "Create unsubscribe page and track unsubscribed users"

#### STEP 1: Add Unsubscribe Field to User (`server/src/models/User.ts`)

```typescript
export interface IUser {
  // ... existing fields ...
  unsubscribedFromNewsletter?: boolean;  // ← ADD THIS
}

const userSchema = new mongoose.Schema<IUser>(
  {
    // ... existing fields ...
    unsubscribedFromNewsletter: { type: Boolean, default: false },  // ← ADD THIS
  }
);
```

#### STEP 2: Add Unsubscribe Route (`server/src/routes/newsletter.ts`)

```typescript
// POST /api/newsletter/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.findOneAndUpdate(
      { email: email },
      { unsubscribedFromNewsletter: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Successfully unsubscribed from newsletters',
      email: email
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Optional: GET unsubscribe page
router.get('/unsubscribe/:token', (req, res) => {
  // Return HTML page with unsubscribe button
  res.send(`
    <html>
      <body>
        <h1>Newsletter Unsubscribe</h1>
        <button onclick="unsubscribe('${req.query.email}')">
          Unsubscribe from newsletters
        </button>
        <script>
          function unsubscribe(email) {
            fetch('/api/newsletter/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            }).then(r => r.json())
            .then(d => alert(d.message))
            .catch(e => alert('Error: ' + e));
          }
        </script>
      </body>
    </html>
  `);
});
```

#### STEP 3: Modify Newsletter Service

**In `server/src/services/newsletter.ts`:**

```typescript
export async function sendWeeklyNewsletter() {
  try {
    // ... existing code ...

    // Get all buyers EXCLUDING unsubscribed ones
    const buyers = await User.find({
      roles: 'buyer',
      neighborhood: { $exists: true, $ne: null },
      unsubscribedFromNewsletter: { $ne: true }  // ← ADD THIS FILTER
    });

    // ... rest of code ...
  } catch (error) {
    console.error('Error sending newsletter:', error);
  }
}
```

#### STEP 4: Test
```
1. Create a test user with email
2. Call POST /api/newsletter/unsubscribe with that email
3. Check MongoDB: user.unsubscribedFromNewsletter should be true
4. Send newsletter: test user should NOT be in recipient list
```

---

### Common Modification: Add Frequency Selection

**Requirement**: "Let users choose weekly, monthly, or never for newsletters"

#### STEP 1: Update User Model

```typescript
enum NewsletterFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NEVER = 'never'
}

export interface IUser {
  // ... existing fields ...
  newsletterFrequency?: string;  // ← ADD THIS
}

const userSchema = new mongoose.Schema<IUser>(
  {
    // ... existing fields ...
    newsletterFrequency: {
      type: String,
      enum: ['weekly', 'monthly', 'never'],
      default: 'weekly'
    },
  }
);
```

#### STEP 2: Filter by Frequency in Newsletter Service

```typescript
export async function sendWeeklyNewsletter() {
  try {
    // Get buyers subscribed to WEEKLY
    const buyers = await User.find({
      roles: 'buyer',
      neighborhood: { $exists: true, $ne: null },
      newsletterFrequency: 'weekly'  // ← FILTER BY FREQUENCY
    });

    // ... rest of code ...
  }
}

export async function sendMonthlyNewsletter() {
  try {
    // Get buyers subscribed to MONTHLY
    const buyers = await User.find({
      roles: 'buyer',
      neighborhood: { $exists: true, $ne: null },
      newsletterFrequency: 'monthly'  // ← DIFFERENT FREQUENCY
    });

    // ... rest of code ...
  }
}
```

#### STEP 3: Test
```
1. User setting: change newsletter frequency to 'monthly'
2. Send weekly newsletter: should not receive
3. Send monthly newsletter: should receive
```

---

## Feature 5: Delivery Status Updates

### Common Modification: Add Delivery Photo as Mandatory

**Requirement**: "Photo proof becomes mandatory for delivery, not optional"

#### STEP 1: Modify Backend Validation (`server/src/routes/orders.ts`)

**Find the delivered status update:**
```typescript
if (nextStatus === 'delivered') {
  // Validate proof
```

**Update validation:**
```typescript
if (nextStatus === 'delivered') {
  const proof = parsed.data.proof;
  
  // Photo is now MANDATORY
  if (!proof || !proof.photoUrl) {
    return res.status(400).json({ 
      error: 'Photo proof is required for delivery' 
    });
  }
  
  // PIN is still required
  if (!proof.pinLast4) {
    return res.status(400).json({ 
      error: 'PIN verification required for delivery' 
    });
  }

  // Validate PIN
  const order = await Order.findById(req.params.id);
  const deliveryPin = order.delivery.deliveryPin;
  const pinLast4 = deliveryPin.slice(-4);

  if (proof.pinLast4 !== pinLast4) {
    return res.status(400).json({ error: 'PIN does not match' });
  }
}
```

#### STEP 2: Modify Frontend (`client/src/pages/Dashboard.tsx`)

**Find delivery proof modal:**
```typescript
{showPinModal && (
  <div className="modal">
    <input type="text" maxLength="4" placeholder="PIN" />
    <input type="file" accept="image/*" />  {/* ← Make required */}
    <button>Confirm Delivery</button>
  </div>
)}
```

**Make photo required:**
```typescript
{showPinModal && (
  <div className="modal">
    <input 
      type="text" 
      maxLength="4" 
      placeholder="PIN"
      required
    />
    
    {/* Make photo REQUIRED */}
    <input 
      type="file" 
      accept="image/*"
      required
      onChange={(e) => {
        if (!e.target.files?.[0]) {
          alert('Photo is required');
          return;
        }
        uploadDeliveryPhoto(e.target.files[0]);
      }}
    />
    
    {driverPhotoUrl && <img src={driverPhotoUrl} alt="Proof" />}
    
    <button 
      disabled={!driverPhotoUrl}  // ← Disable until photo uploaded
      onClick={handleMarkDelivered}
    >
      Confirm Delivery
    </button>
  </div>
)}
```

#### STEP 3: Test
```
1. Try to deliver without photo → Should error
2. Try to deliver with photo but no PIN → Should error
3. Provide both photo and PIN → Should succeed
4. Check MongoDB: both proof.photoUrl and proof.pinLast4 saved
```

---

### Common Modification: Add Rating for Driver

**Requirement**: "After delivery, buyer rates the driver (1-5 stars)"

#### STEP 1: Add Rating to Order Model (`server/src/models/Order.ts`)

```typescript
const orderSchema = new mongoose.Schema({
  // ... existing fields ...
  delivery: {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryPin: { type: String },
    proof: {
      pinLast4: String,
      photoUrl: String
    },
    driverRating: {         // ← ADD THIS
      stars: { type: Number, min: 1, max: 5 },
      comment: { type: String }
    }
  }
});
```

#### STEP 2: Add Rating Route (`server/src/routes/orders.ts`)

```typescript
export const rateDriverRoute = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.activeRole !== 'buyer') {
      return res.status(403).json({ error: 'Only buyers can rate' });
    }

    const { stars, comment } = req.body;
    
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Stars must be 1-5' });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Can only rate delivered orders' });
    }

    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not your order' });
    }

    // Save rating
    order.delivery.driverRating = {
      stars,
      comment: comment || ''
    };
    
    await order.save();

    return res.json({ 
      message: 'Driver rated successfully',
      order 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to rate driver' });
  }
};
```

#### STEP 3: Add Frontend Rating Component

```typescript
// After order is delivered, show rating form:
{buyerOrder.status === 'delivered' && !buyerOrder.delivery?.driverRating && (
  <div className="border rounded-lg p-4">
    <p>Rate your delivery experience:</p>
    
    {/* Star rating */}
    <div className="flex gap-2 my-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => setDriverRating(star)}
          className={star <= (driverRating || 0) ? 'text-yellow-500' : 'text-gray-300'}
        >
          ⭐
        </button>
      ))}
    </div>

    {/* Comment */}
    <textarea
      placeholder="Optional comment"
      value={driverComment}
      onChange={(e) => setDriverComment(e.target.value)}
      className="w-full border rounded p-2 my-2"
    />

    <button
      onClick={() => submitDriverRating(buyerOrder._id)}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      Submit Rating
    </button>
  </div>
)}
```

#### STEP 4: Test
```
1. Complete delivery
2. Buyer should see rating form
3. Submit 5 stars with comment
4. Check MongoDB: order.delivery.driverRating saved
5. Reload page: rating should persist
```

---

# Common Modification Requests

## Request Type 1: "Add a new field to [Model]"

### Procedure:
```
1. Open server/src/models/[Model].ts
2. Add field to interface
3. Add field to mongoose schema
4. Update any routes that use this model
5. Add validation if needed
6. Test with Postman/curl
```

**Example**: Add `phoneNumber` to Order
```typescript
// 1. Interface
export interface IOrder {
  phoneNumber?: string;
}

// 2. Schema
const orderSchema = new mongoose.Schema({
  phoneNumber: { type: String },
  // ...
});

// 3. Route that uses it
export const createOrderRoute = async (req, res) => {
  const order = new Order({
    phoneNumber: req.body.phoneNumber,
    // ...
  });
};
```

---

## Request Type 2: "Change how [Feature] works"

### Procedure:
```
1. Understand current flow (check routes/services)
2. Identify all affected files
3. Plan changes (draw diagram if complex)
4. Modify backend first
5. Test backend with Postman
6. Modify frontend
7. Test full flow in browser
8. Check for side effects in other features
```

---

## Request Type 3: "Add error handling for [Scenario]"

### Procedure:
```typescript
// Common error scenarios:

// 1. User not authenticated
if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

// 2. User doesn't have permission
if (req.user.activeRole !== 'seller') {
  return res.status(403).json({ error: 'Forbidden' });
}

// 3. Resource not found
const item = await Model.findById(id);
if (!item) return res.status(404).json({ error: 'Not found' });

// 4. Validation failed
if (!email || !password) {
  return res.status(400).json({ error: 'Missing fields' });
}

// 5. Database error
try {
  // ... database operation
} catch (error) {
  return res.status(500).json({ error: 'Database error' });
}
```

---

# Testing Procedures

## Before Showing Examiner

### Quick Checklist:
```bash
# 1. Check TypeScript compilation
npm run build

# 2. Start backend
cd server && npm start
# Should show: "Server running on port 5000"

# 3. Start frontend (new terminal)
cd client && npm run dev
# Should show: "Local: http://localhost:5173"

# 4. Open browser
# http://localhost:5173
# Check console for errors (F12)

# 5. Test with Postman
# Make API call to modified endpoint
# Should return expected data

# 6. Check git status
git status
git diff  # Review your changes
```

### Testing Modified Feature:
```
SEARCH & FILTER:
  ✓ Type in search box
  ✓ Select category
  ✓ Adjust price range
  ✓ Enable location (if modified)
  ✓ Results update correctly
  
ORDER MANAGEMENT:
  ✓ Create order
  ✓ Accept/reject order (as seller)
  ✓ Mark ready for pickup
  ✓ Check status updates in database
  
DRIVER DASHBOARD:
  ✓ Toggle online/offline
  ✓ Check available orders
  ✓ Claim an order
  ✓ Update delivery status
  
NEWSLETTERS:
  ✓ Send test newsletter
  ✓ Check email inbox
  ✓ Click link in email
  ✓ Verify tracking in SendGrid
  
DELIVERY STATUS:
  ✓ Complete full delivery flow
  ✓ Test PIN verification
  ✓ Test photo upload
  ✓ Check final status in DB
```

---

# Error Handling During Exam

## If Backend Won't Compile

```bash
# 1. Check error message
npm run build

# 2. Common errors:
# - Missing imports: add at top of file
# - Type errors: check interfaces match
# - Syntax errors: look for missing ;, }, )

# 3. Fix and retry
npm run build
```

## If Frontend Won't Compile

```bash
# 1. Check browser console (F12)
# 2. Common errors:
# - Component not exported: check export statement
# - Import error: verify path is correct
# - Type mismatch: check prop types
```

## If Feature Doesn't Work

```bash
# 1. Check backend logs (server terminal)
# 2. Check browser console (F12)
# 3. Check network tab (F12 → Network)
# 4. Test with Postman to isolate issue
# 5. Check MongoDB data (MongoDB Compass)
```

## If You Made Mistake

```bash
# Option 1: Undo last change
git checkout -- <filename>

# Option 2: See what you changed
git diff <filename>

# Option 3: Rollback to backup branch
git checkout backup/before-modification
```

---

# Git & Deployment

## Making Your Changes Visible

### For Examiner Review:

```bash
# 1. Ensure everything committed
git status
# Should show: "nothing to commit, working tree clean"

# 2. Show your commits
git log --oneline -10

# 3. Show what changed
git diff HEAD~1 HEAD  # Changes in last commit
# or
git show HEAD  # Full last commit

# 4. Show specific file changes
git diff HEAD~1 -- server/src/routes/search.ts
```

### Commit Message Format:

```bash
# Good commits
git commit -m "feat: add distance-based sorting to search results"
git commit -m "fix: handle missing location in driver overview"
git commit -m "refactor: simplify newsletter grouping logic"
git commit -m "docs: update search API documentation"

# Format: [type]: [description]
# Types: feat, fix, refactor, docs, test, perf, chore
```

---

## Deployment Checklist

```
BEFORE SHOWING TO EXAMINER:

Code Quality:
  ☐ No console.log() left over
  ☐ No commented-out code
  ☐ TypeScript compiles without warnings
  ☐ Proper error handling added
  ☐ Type safety maintained

Testing:
  ☐ Backend running without errors
  ☐ Frontend running without errors
  ☐ Feature works in browser
  ☐ API works with Postman
  ☐ Database changes reflected

Git:
  ☐ All changes committed
  ☐ Clear commit messages
  ☐ Can show git log
  ☐ No uncommitted changes

Security:
  ☐ No API keys in code
  ☐ Proper authentication checks
  ☐ Input validation added
  ☐ SQL injection not possible (using MongoDB)
  ☐ CORS properly configured
```

---

# Quick Reference Commands

## Essential Commands

```bash
# ===== GIT =====
git status                          # See what changed
git add .                            # Stage all changes
git commit -m "message"              # Commit changes
git log --oneline -5                 # See last 5 commits
git diff                             # See changes not staged
git checkout -- <file>               # Undo changes to file
git branch                           # See current branch
git checkout -b backup/name          # Create backup branch

# ===== BACKEND =====
cd server
npm install                          # Install dependencies
npm run build                        # Compile TypeScript
npm start                            # Start server
npm run dev                          # Start with auto-reload

# ===== FRONTEND =====
cd client
npm install                          # Install dependencies
npm run build                        # Compile TypeScript
npm run dev                          # Start dev server

# ===== TESTING =====
# Backend: Use Postman or curl
curl -X GET http://localhost:5000/api/health

# Frontend: Open browser
# F12 to open DevTools
# Check Console tab for errors
# Check Network tab for API calls

# Database:
# MongoDB Compass GUI
# Or command line: mongosh
```

## Postman Testing Patterns

```
GET /api/search?keyword=milk&lat=23.8&lng=90.4
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}

POST /api/orders
Body (JSON):
  {
    "lines": [
      {
        "productId": "123",
        "storeId": "456",
        "name": "Product",
        "unitPrice": 100,
        "qty": 2
      }
    ]
  }

PATCH /api/orders/ORDER123/status
Body (JSON):
  {
    "status": "accepted"
  }
```

---

## Common TypeScript Fixes

```typescript
// ✓ Proper type checking
if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

// ✗ Wrong (could cause undefined error)
if (req.user === null) return res.status(401)...

// ✓ Optional chaining
const status = order?.status;

// ✗ Wrong (might crash if order null)
const status = order.status;

// ✓ Type casting
const userId = req.user?.id as string;

// ✗ Wrong (undefined might return)
const userId = req.user.id;
```

---

# Exam Tips

## What Examiner Will Ask About Your Changes

1. **"Explain this line of code"**
   - Be ready to explain any line you added
   - Reference specific functions/variables

2. **"Why did you make this change?"**
   - Reference the requirement
   - Explain the logic

3. **"What happens if [scenario]?"**
   - Test it live
   - Show error handling

4. **"Show me the git commit"**
   - `git log` to show commits
   - `git show` to show details

5. **"What if multiple users try to do this simultaneously?"**
   - Explain race condition prevention
   - For drivers: atomic MongoDB operations
   - For orders: ID matching checks

## Common Pitfalls to Avoid

```
❌ NOT TO DO:
  - Make changes without testing first
  - Leave console.log() in production code
  - Modify without understanding the flow
  - Forget to handle errors
  - Change database without updating schema
  - Leave TypeScript errors
  - Push uncommitted changes

✅ DO:
  - Understand requirement completely
  - Plan changes before coding
  - Test incrementally as you go
  - Add proper error handling
  - Commit frequently with clear messages
  - Show your work on Git
  - Test all scenarios
```

---

## Time Management

```
Typical Exam Structure:

Initial Explanation: 5-10 min
  → Examiner explains what to modify

Understanding & Planning: 5 min
  → Ask clarifying questions
  → Plan your approach

Implementation: 20-30 min
  → Make changes
  → Test as you go

Testing & Demonstration: 10 min
  → Show feature working
  → Demonstrate with data

Git & Code Review: 5 min
  → Show commits
  → Explain changes

Q&A: 10-15 min
  → Answer questions about implementation
  → Explain error handling
  → Discuss alternatives

Total: 60-75 minutes
```

---

## Last Minute Reminders

```
☐ Open VS Code BEFORE exam starts
☐ Have backend terminal ready
☐ Have frontend running
☐ Have Postman ready for API testing
☐ Have MongoDB Compass ready
☐ Have Git command handy
☐ Ensure internet connection stable
☐ Test all 5 features work normally
☐ Take deep breath
☐ Read requirement carefully
☐ Ask for clarification if unsure
☐ Code step by step
☐ Test frequently
☐ Commit with clear messages
```

---

## Quick Modification Decision Tree

```
Examiner says: "Modify [Feature]"
  │
  ├─ "Add a new field"?
  │   └─ Model → Schema → Routes → Test
  │
  ├─ "Change how it works"?
  │   └─ Route logic → Test API → Frontend UI → Full test
  │
  ├─ "Add error handling for [case]"?
  │   └─ Add if-check → return error response → Test negative case
  │
  ├─ "Make it work for [role]"?
  │   └─ Add role check → Test with different roles → Verify access control
  │
  ├─ "Add notification/alert for [event]"?
  │   └─ Add flag to response → Show in UI → Test trigger
  │
  └─ "Allow users to [action]"?
      └─ Add endpoint → Add frontend button → Add input form → Test flow
```

---

## Final Checklist (30 min before showing examiner)

```
CODE:
  ☐ All files saved
  ☐ No TypeScript errors (npm run build)
  ☐ No syntax errors in IDE
  ☐ Proper indentation
  ☐ Clear variable names

RUNNING:
  ☐ Backend server running (no errors in terminal)
  ☐ Frontend dev server running (no errors in terminal)
  ☐ Browser at http://localhost:5173 (no console errors)
  ☐ Feature accessible and working

TESTING:
  ☐ Tested happy path (works correctly)
  ☐ Tested error cases (shows proper errors)
  ☐ Checked database (data saved correctly)
  ☐ Tested with different user roles (if applicable)

GIT:
  ☐ All changes staged (git add .)
  ☐ Committed with good message (git commit -m "...")
  ☐ Can show commits (git log)
  ☐ Clean working tree (git status)

READY:
  ☐ Can explain every line of code
  ☐ Understand why each change was made
  ☐ Know how to test specific scenarios
  ☐ Ready to answer questions
  ☐ Ready to show the working feature
```

---

**Good luck with your live modification exam! Remember: take your time, understand the requirement, code carefully, test thoroughly, and demonstrate confidently.** 🚀

