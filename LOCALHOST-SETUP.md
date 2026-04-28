# Running Bazar Koro on Localhost

This guide explains how to run the full Bazar Koro application (React frontend + Express API) on your local machine for development.

## Architecture

```
Browser  ─►  Vite Dev Server (localhost:5173)  ─►  Express API (localhost:3000)  ─►  MongoDB
```

The Vite dev server proxies all `/api/*` requests to the Express backend running on port 3000.

---

## Prerequisites

Make sure you have the following installed:

- **Node.js** (v20+) - [Download](https://nodejs.org/)
- **MongoDB** - Either:
  - Local MongoDB server ([Download](https://www.mongodb.com/try/download/community))
  - OR MongoDB Atlas cloud database ([Free tier](https://www.mongodb.com/cloud/atlas))

Check your installations:
```powershell
node --version    # Should be v20+
npm --version     # Should be v10+
mongod --version  # If using local MongoDB
```

---

## Setup Instructions

### 1) Install Dependencies

```powershell
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### 2) Configure Environment Variables

Create a `.env` file in the `server/` directory (or copy from `.env.example`):

```
MONGODB_URI=mongodb://localhost:27017/bazar-koro
PORT=3000
JWT_SECRET=dev-secret-change-me-in-production
CLIENT_BASE_URL=http://localhost:5173
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
```

**Optional API Keys** (for full features):
- Add `SENDGRID_API_KEY` for email notifications
- Add `GOOGLE_MAPS_API_KEY` for maps
- Add `OUTH_GOOGLE_CLIENT_ID` for Google login
- Add Cloudinary keys for image uploads

### 3) Set Up MongoDB

**Option A: Use Local MongoDB**
```powershell
# Start MongoDB (if installed locally)
mongod
```

**Option B: Use MongoDB Atlas (Cloud)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/bazar-koro`
4. Update `MONGODB_URI` in `.env`

### 4) Run the Application

Open two terminals:

**Terminal 1 - Start the Backend (Express API)**
```powershell
cd server
npm run dev
# Output: API listening on http://localhost:3000
```

**Terminal 2 - Start the Frontend (Vite Dev Server)**
```powershell
cd client
npm run dev
# Output: VITE v... ready in ... ms
#         ➜  Local:   http://localhost:5173/
```

### 5) Access the Application

Open your browser and go to: **http://localhost:5173**

The frontend will automatically proxy API requests to `http://localhost:3000`.

---

## Verifying the Setup

### Check API Health
```bash
curl http://localhost:3000/api/health
# Response: {"status":"ok"}
```

### Test Payment Callback URLs
Payment success/cancel redirects use:
- Success: `http://localhost:5173/success?orderId=...`
- Cancel: `http://localhost:5173/cancel`

These are controlled by `CLIENT_BASE_URL` in `.env`

---

## Troubleshooting

### MongoDB Connection Failed
- **Error**: `Failed to connect to MongoDB`
- **Solution**: 
  - Ensure MongoDB is running (`mongod`)
  - OR update `MONGODB_URI` to your MongoDB Atlas connection string
  - Check credentials in the connection string

### Port Already in Use
- **Error**: `Error: listen EADDRINUSE :::3000`
- **Solution**: Change `PORT` in `.env` to another port (e.g., `3001`)

### API Requests Failing
- **Check**: Is the backend running on port 3000?
- **Check**: Is `vite.config.ts` proxy configured correctly?
  ```typescript
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  }
  ```

### CORS Errors
- **Solution**: The backend has CORS enabled for all origins in development
- Check `server/src/app.ts` for CORS middleware configuration

---

## Building for Production

To deploy on Hostinger, see [DEPLOY.md](./DEPLOY.md) for comprehensive deployment instructions.

```powershell
# Build the application
npm run build

# Output files:
# - server/dist/  (compiled backend)
# - client/dist/  (built frontend)
```

---

## Project Structure

```
Bazar-Koro/
├── client/                 # React frontend (Vite)
│   ├── src/               # React components, pages, hooks
│   ├── vite.config.ts     # Vite config with /api proxy
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── app.ts         # Express app setup
│   │   ├── env.ts         # Environment config
│   │   ├── index.ts       # Server entry point
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # MongoDB models
│   │   └── middleware/    # Auth, upload, etc.
│   ├── .env               # Environment variables
│   ├── .env.example       # Example configuration
│   └── package.json
├── shared/                # Shared types
├── DEPLOY.md              # Hostinger deployment guide
└── README.md
```

---

## Next Steps

- Read the main [README.md](./README.md) for project overview
- See [DEPLOY.md](./DEPLOY.md) to deploy to Hostinger
- Check `server/.env.example` for all available configuration options
