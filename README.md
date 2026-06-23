# Bazar Koro — Codebase Guide (Team Doc)

I wrote this document so the whole team can quickly understand **what each folder/file is**, **where new code should go**, and **how the full system fits together**.

> This repo is a **single repository** with 3 workspaces:
> - `client/` = React frontend (browser)
> - `server/` = Express backend API (Node.js)
> - `shared/` = TypeScript types shared by both

---
## Deployed Website - [www.bazarkoro1.com](https://bazarkoro1.com/)
## 1) Quick start (Windows)

### First-time setup

```bash
cd "D:\Bazar Koro"
npm run setup
```

If you prefer the raw npm command (same result):

```bash
npm ci
```

### Run both frontend + backend

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3000/api/health

### Typecheck (recommended before pushing)

```bash
npm run typecheck
```

---

## 2) Repo structure (what goes where)

Here is the mental model I want everyone to use:

- `client/`
  - Everything UI/UX: pages, components, hooks, styling
  - Calls the backend using `/api/...`
- `server/`
  - Everything business logic: auth, RBAC, orders, payments (later), integrations
  - Exposes REST endpoints under `/api/...`
- `shared/`
  - Only **types + small shared utilities** (no React, no Express)
  - Keeps request/response types consistent between client and server

---

## 2.1) File-by-file index (the files we actually touch)

I’m listing the **important** files here (the ones we edit as a team). I’m not listing everything inside `node_modules/` because those are installed dependencies.

### Root
- `package.json` — Monorepo scripts (`dev`, `build`, `typecheck`) and workspace wiring
- `package-lock.json` — Locked dependency versions (auto-managed by npm)
- `.gitignore` — Git ignore rules
- `README.md` — This documentation

### Shared (`shared/`)
- `shared/package.json` — Shared package build/typecheck scripts
- `shared/tsconfig.json` — TypeScript config for building shared types into `shared/dist/`
- `shared/src/index.ts` — Shared types (`UserRole`, `Order`, etc.) used by both client and server

### Server (`server/`)
- `server/package.json` — Server scripts and dependencies (Express/JWT/Zod)
- `server/tsconfig.json` — TypeScript config for backend
- `server/.env.example` — Example environment variables (copy to `.env` locally)
- `server/src/index.ts` — Server entrypoint (starts listening)
- `server/src/app.ts` — Express app setup + route registration
- `server/src/env.ts` — Loads env vars and exports `env`
- `server/src/auth.ts` — Password hashing + JWT helpers
- `server/src/middleware/auth.ts` — `requireAuth`, active-role selection via `x-active-role`, and `requireRole`
- `server/src/storage.ts` — Temporary in-memory “DB” (will later become MongoDB/Mongoose)
- `server/src/routes/health.ts` — `/api/health`
- `server/src/routes/auth.ts` — `/api/auth/*` and `/api/me`
- `server/src/routes/orders.ts` — `/api/orders*` starter workflow

### Client (`client/`)
- `client/package.json` — Client scripts (`dev`, `build`, `typecheck`) and dependencies
- `client/vite.config.ts` — Vite config + `/api` proxy to backend
- `client/tailwind.config.js` — Tailwind file scanning config
- `client/postcss.config.js` — PostCSS pipeline for Tailwind
- `client/eslint.config.js` — Lint rules (template-based)
- `client/tsconfig.json` — TS project references for app + node configs
- `client/tsconfig.app.json` — TS compiler options for browser app
- `client/tsconfig.node.json` — TS compiler options for Vite config
- `client/src/main.tsx` — React entrypoint
- `client/src/App.tsx` — App shell (currently a backend health check)
- `client/src/index.css` — Tailwind directives + global base styles


---

## 3) Root-level files (project orchestration)

### `package.json`
- This is the **root** workspace manager.
- Important scripts:
  - `npm run dev` → runs `server` and `client` together.
  - `npm run dev:server` → runs only the backend.
  - `npm run dev:client` → runs only the frontend.
  - `npm run typecheck` → typechecks all 3 workspaces.

### `package-lock.json`
- This locks dependency versions.
- I don’t manually edit it—npm updates it.

### `.gitignore`
- Controls what *not* to commit.
- If you add new generated folders (like `dist/`), ignore them here.

---

## 4) Shared workspace (`shared/`) — types we all agree on

The goal of `shared/` is to keep our system consistent.

### `shared/src/index.ts`
This exports shared types like:
- `UserRole` (`buyer | seller | driver | marketer | admin`)
- `OrderStatus` (the order state machine)
- Basic interfaces like `Order`, `CartLine`, `UserPublic`

When I add a new concept that both frontend + backend need (example: `Store`, `Product`, `Review`, `Campaign`), I add the type here first.

### `shared/tsconfig.json` and `shared/package.json`
- Builds shared output into `shared/dist/`.
- `prepare` script ensures it builds when installing.

Rule I follow:
- If a file needs DOM/React → it goes in `client/`.
- If a file needs Express/Node APIs → it goes in `server/`.
- If it is only types / pure utilities → it can go in `shared/`.

---

## 5) Backend workspace (`server/`) — Express API

### How the backend is wired

- Entry point: `server/src/index.ts`
  - Starts the app and listens on `PORT`.
- App definition: `server/src/app.ts`
  - Creates the Express app
  - Registers middleware
  - Registers all routes under `/api/...`

### Environment config

- Example env: `server/.env.example`
- Real env file (local): `server/.env` (do not commit)

Variables:
- `PORT` (default 3000)
- `JWT_SECRET` (used to sign login tokens)

### Authentication & RBAC (role switching)

Files:
- `server/src/auth.ts`
  - Password hashing (bcrypt)
  - JWT signing and verification
- `server/src/middleware/auth.ts`
  - `requireAuth` → requires `Authorization: Bearer <token>`
  - Role selection: I can set the *active role* using header `x-active-role`
    - If the header is missing, it falls back to the user’s first role
  - `requireRole(...)` → restricts endpoints by role

Important behavior:
- A single account can have multiple roles.
- The **active role** controls what the user is allowed to do per request.

### Routes (what each file owns)

- `server/src/routes/health.ts`
  - `GET /api/health` — sanity check

- `server/src/routes/auth.ts`
  - `POST /api/auth/register` — create account
  - `POST /api/auth/login` — login
  - `GET /api/me` — current user details (auth required)

- `server/src/routes/orders.ts`
  - `GET /api/orders` — list buyer’s orders (starter version)
  - `POST /api/orders` — create order (buyer-only in starter)
  - `GET /api/orders/:id` — fetch an order (buyer/admin)
  - `POST /api/orders/:id/status` — update status with RBAC rules

### Current storage (IMPORTANT)

File: `server/src/storage.ts`
- Right now this is **in-memory storage** (Maps) so we can demo flows fast.
- This means:
  - Restarting the server resets users/orders.
  - It’s not production-ready.

When we switch to MongoDB:
- I will replace `storage.ts` with real DB logic and likely create folders like:
  - `server/src/models/` (Mongoose schemas)
  - `server/src/repositories/` (DB access)
  - `server/src/services/` (business rules)

I kept it simple at the start so the team can build the UI and workflows without being blocked by database work.

---

## 6) Frontend workspace (`client/`) — React + Vite + Tailwind

### How the frontend talks to the backend

File: `client/vite.config.ts`
- I configured a dev proxy:
  - Any request starting with `/api` is forwarded to `http://localhost:3000`

That means in React I can simply do:

```ts
fetch('/api/health')
```

…and it works during development without CORS pain.

### Main entry files

- `client/src/main.tsx`
  - React root render
- `client/src/App.tsx`
  - Current starter UI: it calls `/api/health` and shows the response.

### Styling

- `client/src/index.css`
  - I replaced the Vite starter CSS and enabled Tailwind directives.
- `client/tailwind.config.js`
  - Defines which files Tailwind scans.
- `client/postcss.config.js`
  - PostCSS pipeline for Tailwind.

### TypeScript configs

- `client/tsconfig.json`, `client/tsconfig.app.json`, `client/tsconfig.node.json`
  - Standard Vite React TS setup.

### Linting

- `client/eslint.config.js`
  - ESLint config from the Vite template.

### Client README

- `client/README.md` is mostly the default Vite template text.
- I treat this repo root README as the main team documentation.

---

## 7) “Where do I put my code?” (team rules)

These rules are how I want us to stay organized as the codebase grows.

### Backend additions

- New REST endpoint?
  1) Create a new route file in `server/src/routes/` (example: `products.ts`)
  2) Export route handler functions
  3) Register the routes inside `server/src/app.ts`

- New business logic?
  - Put it in `server/src/services/` (we’ll create this folder when needed)
  - Keep route handlers thin: validate input → call service → return response

- New shared validation schema?
  - If it’s server-only, keep Zod schemas inside the route file.
  - If both client+server need the same schema, we can move it to `shared/` later.

### Frontend additions

- New page/screen?
  - Create a folder under `client/src/` (example: `client/src/pages/BuyerHome/`)

- Reusable UI components?
  - Create `client/src/components/` and place components there.

- Data fetching and API calls?
  - Create `client/src/api/` and keep all fetch logic there.
  - The rest of the UI should call functions like `api.login(...)` instead of raw `fetch` everywhere.

### Shared additions

- Shared types used by both sides?
  - Add them to `shared/src/index.ts`
  - Then run `npm run build -w shared` if needed.

---

## 8) Current scope vs the project report

Based on our report, the full product includes:
- Buyer: search/filter, cart grouped by store, checkout, history, reviews
- Seller: storefront, inventory, orders, coupons, analytics
- Driver: availability, claim/bid, status updates, proof of delivery, maps routing
- Marketer: sponsored listings, budgets, scheduling, affiliate links, newsletter
- Admin: verification, dispute handling, commission settings

Right now, this repo is a **starter skeleton** to unblock development:
- Auth + role switching skeleton exists
- Orders workflow exists (basic)
- Client can call backend and show results

The next implementation steps are to replace in-memory storage and implement the real modules one-by-one.

---

## 9) Starter API examples (so the team can test fast)

### Register
`POST /api/auth/register`

Body:
```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123", "roles": ["buyer", "seller"] }
```

### Login
`POST /api/auth/login`

Body:
```json
{ "email": "alice@example.com", "password": "secret123" }
```

Then call any protected route with:
- `Authorization: Bearer <token>`
- Optional: `x-active-role: buyer`

### Create an order (buyer)
`POST /api/orders`

Body:
```json
{
  "lines": [
    { "productId": "p1", "storeId": "s1", "name": "Rice", "unitPrice": 80, "qty": 2 }
  ]
}
```

---

## 10) Team workflow I expect (so we don’t step on each other)

- Before pushing:
  - Run `npm run typecheck`
- When changing shared types:
  - Update `shared/src/index.ts`
  - Tell the team in chat what changed (this avoids broken builds)
- PR discipline:
  - Small PRs: 1 feature at a time
  - If you touch `server/src/middleware/auth.ts` or order status rules, call it out in the PR description

---

## 11) Notes / known limitations (so no one is surprised)

- Storage is in-memory right now (`server/src/storage.ts`). We will replace with MongoDB + Mongoose.
- Payments (bKash), images (Cloudinary), routing (Maps), newsletters (SendGrid) are not integrated yet.
- This skeleton is meant to help us build incrementally and keep the team aligned.
