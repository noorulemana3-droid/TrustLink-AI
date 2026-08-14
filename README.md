# TrustLink AI

**Connecting Communities with Trusted Local Services.**

TrustLink AI is a MERN marketplace where people discover verified local professionals (electricians, plumbers, tutors, and more), compare reviews, save favorites, send service requests, and get AI-ranked recommendations.

## Problem

Finding a trusted local service provider often means asking in WhatsApp groups or scrolling Facebook posts, with little proof of quality.

## Solution

A community marketplace with:

- Verified provider profiles
- Ratings and reviews
- Search and filters
- Transparent AI recommendations
- Service request tracking for customers, providers, and admins

## Key features

- Register / login / logout (JWT)
- Forgot password + reset password
- Role-based access: customer, provider, admin
- Provider profiles, categories, availability
- Search, filters, sorting, pagination
- Reviews, ratings, favorites
- Service requests: send, accept, reject, complete, cancel
- Hybrid AI recommendations (works without an LLM key)
- Customer, provider, and admin dashboards

## User roles

| Role | What they do |
|------|----------------|
| Customer | Search, review, favorite, request services, track requests |
| Provider | Publish a profile, set availability, accept/reject/complete jobs |
| Admin | Approve providers, moderate reviews, manage users and categories |

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs |
| AI | Heuristic ranking always; optional OpenAI or Gemini for NL parse + review summaries |
| Docs / monitoring | Swagger UI (`/api/docs`), Sentry.io error tracking |

## AI recommendation system

The existing ranking engine is unchanged. It:

1. Parses the user’s request into filters (category, city, area, budget, keywords)
2. Queries approved providers in MongoDB
3. Scores fit using rating, reviews, price, experience, location, verification, and keywords
4. Returns ranked matches with reasons

The UI shows **Best Match** / **% Match** and 3–4 reasons supported by real data only.

If `GEMINI_API_KEY` / `OPENAI_API_KEY` are unset, heuristic parsing still works.

## Local MongoDB setup

Development uses **local MongoDB**, not Atlas.

1. Install and start MongoDB locally
2. Set in `server/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/trustlink-ai
```

Production can later point `MONGODB_URI` at MongoDB Atlas. Do not commit that URI.

## Environment variables

Copy `server/.env.example` to `server/.env`.

```env
MONGODB_URI=mongodb://127.0.0.1:27017/trustlink-ai
JWT_SECRET=
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=
EMAIL_USER=
EMAIL_PASSWORD=
SENTRY_DSN=
```

Optional: `GEMINI_API_KEY`, Cloudinary keys, `SMTP_USER` / `SMTP_PASS` (same as email sender).

**Do not commit .env files.**

## Installation

```bash
npm install
npm run install:all
```

Or:

```bash
cd server && npm install
cd ../client && npm install
```

## How to run backend

```bash
cd server
cp .env.example .env
# edit .env — set JWT_SECRET and local MONGODB_URI
npm run seed
npm run dev
```

API: http://localhost:5000/api/health  
Swagger: http://localhost:5000/api/docs

## How to run frontend

```bash
cd client
npm run dev
```

App: http://localhost:5173

From the repo root (after `npm install`):

```bash
npm run dev
```

## Demo accounts

After `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@trustlink.ai | Admin123! |
| Customer | customer@trustlink.ai | Customer123! |
| Provider | electrician@trustlink.ai | Provider123! |

These are seed demo accounts only, not production credentials.

## Swagger API docs

With the API running, open:

- http://localhost:5000/api/docs  
- or http://localhost:5173/api/docs (Vite proxy)

Use **Authorize** with a JWT from `POST /api/auth/login` to try protected routes.

## Sentry error tracking

1. Create a free project at [sentry.io](https://sentry.io) (platform: **Node.js / Express**)
2. Copy the DSN into `server/.env` as `SENTRY_DSN=...`
3. Restart the API
4. Trigger a sample error:

```bash
npm run sentry:sample
```

Or open: http://localhost:5000/api/debug/sentry  

Then check **Sentry → Issues** for:  
`TrustLink AI sample Sentry error — assignment verification`

## OpenAI (optional, already integrated)

Set `OPENAI_API_KEY` in `server/.env` to improve natural-language parsing and review summaries. Ranking still works without a key (heuristic fallback). Gemini is an alternative via `GEMINI_API_KEY`.

## Main user flow

Search → Provider → Reviews → Favorite → AI recommendation → Request service → Provider accepts → Admin moderates

## Deploy (live)

Do **not** upload `.env` files. Copy values into the host dashboards instead.

### 1. GitHub

Push this repo (`.env` is gitignored). Then connect the same repo to Render and Vercel.

### 2. API — [Render](https://render.com)

1. New → Blueprint, or Web Service from this repo
2. Root directory: `server`
3. Build: `npm install` · Start: `npm start` · Health: `/api/health`
4. Set env vars from `server/.env.example` (MongoDB Atlas URI, `JWT_SECRET`, `SENTRY_DSN`, SMTP, etc.)
5. After the frontend URL exists, set `CLIENT_URL` to that origin and redeploy

### 3. Frontend — [Vercel](https://vercel.com)

1. Import the GitHub repo
2. Root directory: `client`
3. Set `VITE_API_URL` to `https://YOUR-API.onrender.com/api` (must end with `/api`)
4. Redeploy after changing env

Live Swagger: `https://YOUR-API.onrender.com/api/docs`

## Security note

- Secrets live only in `server/.env` locally, or in Render / Vercel env settings
- `.env` is gitignored
- `.env.example` contains placeholders only
- **Do not commit .env files.**

## License

MIT — university / portfolio project.
