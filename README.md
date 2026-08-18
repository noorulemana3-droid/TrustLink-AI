# TrustLink AI

**Connecting Communities with Trusted Local Services.**

TrustLink AI is a MERN marketplace where people discover verified local professionals (electricians, plumbers, tutors, and more), compare reviews, save favorites, send service requests, and get AI-ranked recommendations.

## Live demo

| | URL |
|---|-----|
| **App** | https://trustlink-ai.vercel.app |
| Login | https://trustlink-ai.vercel.app/login |
| Register | https://trustlink-ai.vercel.app/register |
| Forgot password | https://trustlink-ai.vercel.app/forgot-password |
| Providers | https://trustlink-ai.vercel.app/providers |
| AI assistant | https://trustlink-ai.vercel.app/ai |
| **API health** | https://trustlink-ai-api-production.up.railway.app/api/health |
| **Swagger** | https://trustlink-ai-api-production.up.railway.app/api/docs |
| **Source** | https://github.com/noorulemana3-droid/TrustLink-AI |

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
- Forgot password + reset password (on-page reset link on live hosting; email when SMTP/HTTPS mail is configured)
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

Optional: `GEMINI_API_KEY`, Cloudinary keys, `SMTP_USER` / `SMTP_PASS` (local Gmail App Password), `BREVO_API_KEY` (HTTPS mail on Railway).

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

These are seed demo accounts (not real inboxes). `@trustlink.ai` cannot receive mail.

### Forgot password (live)

Railway Hobby/Free **blocks Gmail SMTP**, so the live app does not wait for an email that never arrives.

1. Open https://trustlink-ai.vercel.app/forgot-password
2. Enter a registered email (demo: `customer@trustlink.ai`)
3. Click **Get reset link**
4. Click **Open reset page**, set a new password (min 8 characters)

Locally, Gmail SMTP in `server/.env` still sends a real email when `SMTP_USER` / `SMTP_PASS` are set. To send real mail from Railway, add a free HTTPS key (`BREVO_API_KEY`) — see `server/.env.example`.

## Swagger API docs

With the API running, open:

- https://trustlink-ai-api-production.up.railway.app/api/docs  
- Local: http://localhost:5000/api/docs  

In Swagger, the **server** dropdown must be the live Railway URL (not `localhost`) when you are on the live docs page. Use **Authorize** with a JWT from `POST /api/auth/login`.

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

This project is live as:

- **Frontend:** [Vercel](https://vercel.com) → https://trustlink-ai.vercel.app  
- **API:** [Railway](https://railway.app) → https://trustlink-ai-api-production.up.railway.app  

### 1. GitHub

Push this repo (`.env` is gitignored). Connect the same repo to Railway and Vercel.

### 2. API — [Railway](https://railway.app)

1. New project from this GitHub repo
2. Root can stay the repo root (`railway.toml` runs `npm install` / `npm start` in `server`)
3. Health check: `/api/health`
4. Set env vars from `server/.env.example`: Atlas `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL=https://trustlink-ai.vercel.app`
5. Optional: `SENTRY_DSN`, `BREVO_API_KEY` (Railway Hobby blocks SMTP ports)

Node **20+** is required (`engines` in `server/package.json`).

### 3. Frontend — [Vercel](https://vercel.com)

1. Import the GitHub repo
2. Root directory: `client`
3. Set `VITE_API_URL` to `https://trustlink-ai-api-production.up.railway.app/api` (must end with `/api`)
4. Redeploy after changing env

Live Swagger: https://trustlink-ai-api-production.up.railway.app/api/docs

## Security note

- Secrets live only in `server/.env` locally, or in Railway / Vercel env settings
- `.env` is gitignored
- `.env.example` contains placeholders only
- **Do not commit .env files.**

## License

MIT — university / portfolio project.
