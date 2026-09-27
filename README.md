# Paras Pavers — Full-Stack Website

Frontend (your original design, preserved) + Node.js/Express backend + MySQL, with a
customer rating system and an AI-assisted paver quantity / brass calculator.

## ⚠️ About deployment — please read first

I built and locally verified the entire application below (server boots, static
frontend serves, calculator math is unit-tested, error handling degrades gracefully
without a database). **I was not able to actually deploy it to a live cloud URL or
provision a cloud MySQL database for you** — my environment only has network access
to package registries (npm, GitHub, PyPI), not to hosting providers like Railway,
Render, Vercel, or AWS, and I can't create accounts on your behalf.

The good news: because everything is already built and structured for cloud
deployment, getting a real public HTTPS URL takes about 10–15 minutes of your own
clicking. Steps below (Section: Deploy to the Cloud).

---

## What's included

- **Frontend** — your original navbar, hero, product cards, contact/map section and
  footer are untouched in structure/copy/colors/fonts. Added: mobile hamburger menu,
  star ratings + review modal on each product card, the AI Paver Quantity Calculator
  section, loading/success/error states, and a WhatsApp button that prefills your
  calculation results.
- **Backend** — Node.js + Express REST API (`backend/`)
- **Database** — MySQL schema with `products`, `product_reviews`, `quantity_calculations`
  (`database/schema.sql`)
- **Calculator** — deterministic math in `backend/utils/calculate.js` (unit-tested),
  with an optional AI explanation layer that never overrides the numbers
- **Admin API** — token-protected endpoints to manage products/view reviews & calculations

## Why the original image paths had to change

Your original file referenced `C:\FAMILLY PHOTO\...jpg` — a path that only exists on
your personal Windows PC. No browser anywhere else can load it; it would show a
broken image icon to every visitor. I replaced these with `/assets/products/*.jpg`
and the site falls back to a clean placeholder if a file isn't there. **You need to
copy your real product photos into `frontend/assets/products/`** using the exact
filenames listed in `frontend/assets/products/README.txt`.

---

## Run it locally

```bash
# 1. Install dependencies (root package.json covers the backend too)
npm install

# 2. Set up MySQL — create a database, then load the schema
mysql -u root -p -e "CREATE DATABASE paras_pavers"
mysql -u root -p paras_pavers < database/schema.sql

# 3. Configure environment
cp backend/.env.example .env
# edit .env: fill in DB_HOST/DB_USER/DB_PASSWORD/DB_NAME, and set ADMIN_TOKEN

# 4. Start
npm start
# Visit http://localhost:3000
```

`.env` must be at the project root (or inside `backend/`, either works — dotenv
in `backend/config/db.js` and `backend/server.js` looks relative to where you run
`node`, so running `npm start` from the repo root with `.env` at the root is simplest).

---

## Deploy to the cloud (get your real public URL)

The fastest reliable path is **Railway** (one platform for both the Node app and a
managed MySQL database), but Render + PlanetScale, or any Node host + any managed
MySQL, works the same way. Using Railway as the concrete example:

1. **Push this project to a GitHub repo** (create a new repo, `git init`, commit, push).
2. Go to [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo** → select your repo.
3. In the same Railway project, click **+ New → Database → Add MySQL**. Railway
   provisions it and gives you connection variables automatically.
4. On your Node service, open the **Variables** tab and add:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — copy these straight
     from the MySQL service's "Connect" tab (Railway lets you reference them directly
     as `${{MySQL.MYSQLHOST}}` etc.)
   - `DB_SSL=true`
   - `ADMIN_TOKEN` — generate a long random string
   - `CORS_ORIGIN=*`
   - `AI_API_KEY` — optional, only if you want AI-phrased explanations
5. Open the MySQL service's **Data** tab (or connect with a MySQL client using the
   provided credentials) and run the contents of `database/schema.sql` once, to
   create the tables and seed the four products.
6. Railway auto-builds using `package.json` (`npm install` then `npm start`) and
   gives you a public domain under **Settings → Networking → Generate Domain** —
   this is your live HTTPS URL.
7. Open that URL from your phone on mobile data to confirm it works from outside
   your network.

Any other Node-friendly host (Render, Fly.io, a VPS with PM2 + Nginx) works the
same way — just make sure the DB env vars point at a **cloud-hosted** MySQL
instance, not `localhost`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/products` | List active products |
| GET | `/api/products/:id` | Single product |
| GET | `/api/products/:id/reviews` | Recent reviews for a product |
| GET | `/api/products/:id/rating` | Average rating + count |
| POST | `/api/products/:id/reviews` | Submit a review `{ rating, customer_name?, review? }` |
| POST | `/api/calculate-quantity` | Deterministic block/brass calculation |
| POST | `/api/ai/quantity-advice` | Same calculation + friendly AI explanation (works without AI key too) |
| GET/POST/PUT/PATCH | `/api/admin/*` | Product & data management — requires `Authorization: Bearer <ADMIN_TOKEN>` |

### Example: `POST /api/calculate-quantity`
```json
{ "length": 50, "width": 30, "unit": "ft", "blockLength": 200, "blockWidth": 100, "wastage": 5, "depth": 4 }
```
Returns land area, block counts (basic + wastage-adjusted, rounded up), and an
estimated brass figure (1 brass = 100 cubic ft), always labeled as an estimate.

---

## Security notes

- Parameterized SQL everywhere (no string-concatenated queries)
- Input validation + length limits on all review/calculator fields
- `helmet` for HTTP security headers, `express-rate-limit` on review + calculator
  endpoints, CORS configured via env var
- No DB credentials or API keys ever sent to the browser — all secrets live in
  `.env` on the server only
- Generic error messages returned to clients; full errors logged server-side only
- Admin routes require a bearer token (`ADMIN_TOKEN`) — for real multi-admin use,
  swap this for hashed-password login + sessions before going further

## Project structure

```
paras-pavers/
├── frontend/
│   ├── index.html
│   ├── js/main.js
│   └── assets/products/        ← put real product photos here
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/db.js
│   ├── utils/calculate.js
│   └── .env.example
├── database/
│   └── schema.sql
└── package.json
```
