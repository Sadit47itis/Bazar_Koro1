# Deploying Bazar Koro to Hostinger

This guide walks you through deploying the full Bazar Koro stack (React frontend + Express API + MongoDB) to **Hostinger using its built-in Node.js + GitHub deploy feature**.

The architecture in production is:

```
Browser  ─►  Hostinger (Node.js app)  ─►  MongoDB Atlas
                │
                ├─ /api/*  → Express routes
                └─ /*      → built React app (client/dist)
```

One Node process serves both the API and the frontend on the same domain — no CORS issues, no separate frontend hosting.

---

## 0) What you need before starting

Create accounts (all have free tiers) and have these credentials ready:

| Service | Why | Free tier |
|---|---|---|
| **MongoDB Atlas** — https://www.mongodb.com/cloud/atlas | Database | M0 cluster, 512 MB |
| **Cloudinary** — https://cloudinary.com | Image uploads | 25 GB storage |
| **Stripe** — https://dashboard.stripe.com | Payments (use test keys first) | Free, pay per transaction |
| **Google Cloud** — https://console.cloud.google.com | Maps API key | $200 credit/month |
| **Gmail account + App Password** — https://myaccount.google.com/apppasswords | Receipt emails | Free |

You should also have:
- Your **Hostinger domain** (e.g. `bazarkoro.com`)
- Your **Hostinger hosting plan** with Node.js support (the screenshot you showed confirms this)
- Your **GitHub repo** already linked in hPanel

---

## 1) Set up MongoDB Atlas (5 minutes)

1. Go to https://cloud.mongodb.com → Create a free **M0** cluster (pick a region close to your Hostinger server, e.g. Singapore or Mumbai for South Asia traffic).
2. **Database Access** → Add new user → username `bazarkoro`, generate a strong password, role `Atlas admin`. **Save the password.**
3. **Network Access** → Add IP Address → click **"Allow access from anywhere" (0.0.0.0/0)**. (Hostinger Node hosts use shared IPs that change; allowlisting all IPs is the safe default. If on VPS with a fixed IP, allowlist only that IP.)
4. **Database** → Connect → Drivers → Node.js → copy the connection string. It looks like:
   ```
   mongodb+srv://bazarkoro:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with the real password and add the database name `bazarkoro` before the `?`:
   ```
   mongodb+srv://bazarkoro:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bazarkoro?retryWrites=true&w=majority
   ```
   Save this — it goes into the `MongoDB_URI` env var.

---

## 2) Get the other API keys

### Cloudinary
- Sign up → Dashboard shows **Cloud Name**, **API Key**, **API Secret**. Copy all three.

### Stripe
- Dashboard → Developers → API keys → copy **Secret key** (starts with `sk_test_...` for test mode).
- Stay in test mode until your domain is live and you've tested checkout end-to-end.

### Google Maps
- Google Cloud Console → APIs & Services → Credentials → Create credentials → API key.
- Enable these APIs: **Maps JavaScript API**, **Geocoding API**, **Distance Matrix API**, **Maps Static API**, **Maps Embed API**.
- **Important security step**: there's already a hardcoded Google Maps key in `client/src/components/MapLocationPicker.tsx:53` that's public on your GitHub. **Rotate it now**:
  1. In Google Cloud Console, delete the old key.
  2. Create a new key.
  3. Restrict it to your domain: Application restrictions → HTTP referrers → add `https://yourdomain.com/*` and `https://*.yourdomain.com/*`.
  4. Replace the hardcoded value in `MapLocationPicker.tsx:53` with the new key (or better, refactor to use `import.meta.env.VITE_GOOGLE_MAPS_KEY` — out of scope for first deploy).

### Gmail App Password (for receipts)
- https://myaccount.google.com/apppasswords → create one for "Mail". Save the 16-character password.

---

## 3) Push the deployment changes to GitHub

The following changes have already been made for you (commit and push them):

- `server/src/app.ts` — serves `client/dist` and handles SPA fallback when `NODE_ENV=production`.
- `package.json` — added `start` script (`node server/dist/index.js`), `engines.node >=20`, and `cross-env` devDep.
- `server/.env.example` — documents every env var the app reads.

```bash
cd "D:\Bazar Koro"
git add server/src/app.ts package.json package-lock.json server/.env.example DEPLOY.md
git commit -m "Add Hostinger production deployment setup"
git push origin main
```

---

## 4) Configure the Node.js app in Hostinger

Open hPanel for your hosting plan, then:

### 4a) Create / configure the Node.js app

1. **Websites → Manage → Node.js**
2. If no app exists yet, **Create application**:
   - **Node.js version**: `22.x` (or `20.x` — both work, your `engines` field requires `>=20`)
   - **Application root**: leave default (something like `/home/uXXXX/domains/yourdomain.com/public_html` — Hostinger handles the path)
   - **Application URL**: your domain (e.g. `bazarkoro.com`)
   - **Application startup file**: `server/dist/index.js`
3. **Save**.

### 4b) Connect / re-link your GitHub repo

In the same Node.js panel (or under **Git** in hPanel):

1. **Git** section → make sure your GitHub repo is connected and the branch is `main`.
2. Set the **Build command** field to:
   ```
   npm install && npm run build
   ```
   (Hostinger runs this after every Git pull.)
3. Set the **Start command** to:
   ```
   npm start
   ```
   (Or leave the startup file as `server/dist/index.js` — both work.)

### 4c) Set environment variables

In the Node.js app panel, **Environment variables** section, add **every one** of these:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | a long random string (run locally: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `MongoDB_URI` | the Atlas connection string from step 1 |
| `MONGODB_URI` | same value as `MongoDB_URI` (only needed if you ever run the seed script) |
| `GOOGLE_MAPS_API_KEY` | the new server-side Maps key |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_APP_PASSWORD` | the Gmail App Password |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
| `STRIPE_SECRET_KEY` | `sk_test_...` (use live key only after end-to-end testing) |

**Do NOT** set `PORT` — Hostinger assigns and injects this automatically.

Click **Save**.

---

## 5) Deploy

In the **Git** panel, click **Deploy** (or "Pull latest" + "Restart application").

Hostinger will:
1. `git pull` your latest code
2. Run `npm install` (installs root + workspaces)
3. Run `npm run build` (builds `shared` → `server` → `client`)
4. Run `npm start` (which runs `node server/dist/index.js` with `NODE_ENV=production`)

Watch the deployment logs in hPanel. Common things you'll see:
- `Connected to MongoDB` ✓
- `Super admin created!` (first time only) ✓
- `API listening on http://localhost:XXXX` ✓

---

## 6) Point your domain (if not already pointed)

Since you bought the domain through Hostinger, this is usually automatic. To verify:

1. **Domains → Manage** → check the domain is connected to the same hosting plan as the Node.js app.
2. Visit `https://yourdomain.com` — you should see the Bazar Koro homepage.
3. Visit `https://yourdomain.com/api/health` — should return JSON like `{"status":"ok"}`.

If the site shows a Hostinger placeholder or "404", the Node app isn't catching requests:
- Check the Node.js panel — app should be **Started** (green).
- Confirm the Application URL field matches the domain you're visiting.
- Check the deployment logs for build errors.

---

## 7) Enable HTTPS (free SSL)

1. **Security → SSL** → install free **Let's Encrypt** SSL on your domain.
2. Enable **Force HTTPS**.

Wait ~5 minutes for the certificate to issue. Then `https://yourdomain.com` will work.

---

## 8) Smoke test the live site

In the browser at your live domain:

1. ✅ Homepage loads
2. ✅ `/api/health` returns OK JSON
3. ✅ Sign up a new account → log in → token works
4. ✅ Create a store → upload a product image (tests Cloudinary)
5. ✅ Add to cart → checkout → Stripe redirect (tests Stripe)
6. ✅ Open the Map Location Picker (tests Google Maps key)
7. ✅ Place a test order → check that you receive the receipt email (tests Gmail SMTP)

Log in as the seeded super admin to do admin checks:
- Email: `irtizajabir1@gmail.com`
- Password: `1212IJC`
- **Change this password immediately after first login**, or remove the seed in `server/src/index.ts` lines 7-24 before deploy if you don't want a hardcoded admin in production.

---

## 9) Future deploys

Every time you want to ship changes:

```bash
git add .
git commit -m "your change message"
git push origin main
```

Then in Hostinger hPanel → **Git → Deploy**. Done.

(Hostinger does not usually auto-deploy on push — you have to click Deploy. If you want true auto-deploy, set up a GitHub Action that hits Hostinger's webhook, but that's optional.)

---

## Troubleshooting

**Build fails with "Cannot find module '@bazar-koro/shared'"**
The shared workspace didn't build first. Make sure your build command is exactly `npm install && npm run build` (which runs the root build script that does `shared → server → client` in order).

**App starts but `/api/*` returns 404**
The startup file is wrong. It must be `server/dist/index.js` (not `server/src/index.ts`).

**"Failed to connect to MongoDB"**
Either `MongoDB_URI` is wrong, or your Atlas cluster doesn't allow Hostinger's IP. Check Atlas → Network Access → confirm `0.0.0.0/0` is in the list.

**Cloudinary uploads fail with 401**
Wrong credentials, or you copied the API Secret with extra whitespace. Re-paste from the Cloudinary dashboard.

**Stripe redirect 500s**
You likely set a publishable key (`pk_test_...`) instead of the secret key (`sk_test_...`).

**Frontend loads but pages show blank on refresh (e.g. `/cart` 404s)**
The SPA fallback isn't working. Confirm `NODE_ENV=production` is set in env vars and the app was restarted after setting it.

**Logs show `serverSelectionTimeoutMS` errors**
Atlas is rejecting the connection — IP allowlist or password issue.

**You hit the "Application failed to start" page**
Open the Node.js app logs in hPanel. Almost always it's a missing env var or a syntax error in a recent commit.

---

## Useful local commands

```bash
# Verify the production build works locally before pushing
npm install
npm run build
NODE_ENV=production node server/dist/index.js
# Then visit http://localhost:3000 — you should see the React app, not just the API.

# Just typecheck
npm run typecheck
```

---

## What you can ignore for now

- **Domain email / DNS** — not needed for the app to work; SMTP goes through Gmail.
- **Database backups** — Atlas free tier auto-snapshots daily.
- **CDN / caching** — Hostinger handles static asset caching automatically.
- **Sticky sessions / load balancing** — single Node process is fine until you have real traffic.
