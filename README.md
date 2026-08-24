# Mobile Shop Business Software

A full-stack business management system for a mobile phone shop: inventory
(phones & accessories), point-of-sale checkout with invoicing, repair-ticket
tracking, and customer/supplier management with a reporting dashboard.

## Tech stack

- **Backend:** Node.js, Express, Prisma ORM, SQLite, JWT authentication
- **Frontend:** React (Vite), React Router, Tailwind CSS, Recharts
- **Auth:** JWT bearer tokens, two roles (`admin`, `staff`)

## Features

- **Inventory** — phones & accessories with SKU/IMEI, cost & selling price,
  stock levels, low-stock thresholds, and supplier links.
- **POS / Sales** — cart-based checkout that decrements stock atomically,
  auto-generated invoice numbers, discounts/tax, payment method, refunds,
  and full sales history.
- **Repairs** — ticketed device repairs with status workflow (pending → in
  progress → completed → delivered / cancelled), technician assignment, and
  cost tracking.
- **Customers & Suppliers** — contact records, purchase/repair history per
  customer, and a "restock" flow per supplier that records a purchase and
  increments stock.
- **Dashboard** — today's/month's revenue, low-stock alerts, pending
  repairs, inventory value, top-selling products, and a 14-day revenue
  chart.
- **Staff accounts** — admins can create/disable staff logins and control
  who can delete records.

## Project structure

```
backend/     Express API (Prisma + SQLite)
frontend/    React + Vite single-page app
```

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env       # adjust JWT_SECRET for production
npx prisma migrate dev     # creates dev.db and applies the schema
npm run seed                # creates demo admin/staff users + sample data
npm run dev                 # starts the API on http://localhost:4000
```

Demo logins created by the seed script:

| Role  | Email                  | Password  |
|-------|-------------------------|-----------|
| Admin | admin@mobileshop.com    | admin123  |
| Staff | staff@mobileshop.com    | staff123  |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts the app on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:4000`, so
run the backend first (or alongside).

### 3. Build for production

```bash
cd frontend && npm run build     # outputs static assets to frontend/dist
cd backend && npm start          # run the API with `node src/index.js`
```

Serve `frontend/dist` with any static host (or behind a reverse proxy in
front of the API), and point it at the deployed backend's `/api` URL.

## API overview

All endpoints are namespaced under `/api` and (except `/api/auth/login`)
require an `Authorization: Bearer <token>` header.

| Resource   | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/login`, `GET /auth/me`, `GET/POST /auth/users` (admin), `PATCH /auth/users/:id` (admin) |
| Products   | `GET/POST /products`, `GET/PUT/DELETE /products/:id` |
| Customers  | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id` |
| Suppliers  | `GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/:id`, `POST /suppliers/:id/purchases` |
| Sales      | `GET/POST /sales`, `GET /sales/:id`, `POST /sales/:id/refund` |
| Repairs    | `GET/POST /repairs`, `GET/PATCH/DELETE /repairs/:id` |
| Dashboard  | `GET /dashboard/summary`, `GET /dashboard/sales-by-day` |

Sales and supplier purchases run inside database transactions so stock
levels always stay consistent with recorded items.

## Notes

- SQLite is used for zero-config local development; swap the Prisma
  `datasource` provider to `postgresql` and update `DATABASE_URL` to move to
  Postgres in production — the schema and queries are portable.
- Only `admin` users can delete records or manage staff accounts; `staff`
  users can do everything else (sales, repairs, inventory edits, etc).
