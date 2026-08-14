# TrustLink AI — Day 7 Deploy Guide

**Goal:** Host the live app on the internet.

| Piece | Service | Role |
|-------|---------|------|
| Database | **MongoDB Atlas** | Cloud MongoDB |
| API | **Render** | Express backend (`server/`) |
| Frontend | **Vercel** | React Vite app (`client/`) |

Do these in order: **Atlas → seed → GitHub → Render → Vercel → fix CORS → test**.

---

## Before you start

- GitHub account + this project pushed to a repo
- Accounts: [MongoDB Atlas](https://cloud.mongodb.com), [Render](https://render.com), [Vercel](https://vercel.com)
- Local app already works (`npm run seed`, API + client)

**Do not commit** `.env` files (passwords/secrets).

---

## Step 1 — MongoDB Atlas

1. Sign in → **Create** → free **M0** cluster (any region close to you).
2. **Database Access** → **Add New Database User**
   - Auth: Password
   - Username e.g. `trustlink`
   - Password: generate and **save it**
   - Role: **Atlas admin** or read/write on any database
3. **Network Access** → **Add IP Address**
   - For student/demo: **Allow Access from Anywhere** → `0.0.0.0/0`
4. **Database** → **Connect** → **Drivers**
   - Copy the connection string.

### Format the URI

Replace password and set database name `trustlink-ai`:

```text
mongodb+srv://trustlink:YOUR_PASSWORD@CLUSTER.mongodb.net/trustlink-ai?retryWrites=true&w=majority
```

**Password tip:** If the password has `@`, `#`, `/`, etc., URL-encode it  
(e.g. `@` → `%40`).

### Seed Atlas from your PC

In `server/.env` temporarily set:

```env
MONGODB_URI=mongodb+srv://trustlink:YOUR_PASSWORD@CLUSTER.mongodb.net/trustlink-ai?retryWrites=true&w=majority
```

Then:

```bash
cd server
npm run seed
```

You should see providers/cities logged.  
(Optional) switch `.env` back to local Mongo for day-to-day coding:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/trustlink-ai
```

Atlas keeps the seeded cloud data for Render.

---

## Step 2 — Push to GitHub

```bash
git status
git add .
git commit -m "Prepare Day 7 deploy (Atlas, Render, Vercel)"
git push -u origin main
```

Confirm `server/` and `client/` are in the repo.  
Confirm `.env` is **not** pushed (listed in `.gitignore`).

---

## Step 3 — Backend on Render

### Option A — Blueprint (recommended)

1. Render → **New** → **Blueprint**
2. Connect the GitHub repo
3. It reads [`render.yaml`](render.yaml) (root of project)
4. Fill **sync: false** env vars when prompted (see table below)

### Option B — Manual Web Service

1. Render → **New** → **Web Service**
2. Connect repo
3. Settings:

| Setting | Value |
|---------|--------|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance | Free |

### Environment variables (Render)

| Key | Required | Example / notes |
|-----|----------|-----------------|
| `NODE_ENV` | Yes | `production` |
| `MONGODB_URI` | Yes | Atlas URI from Step 1 |
| `JWT_SECRET` | Yes | Long random string (Render can generate) |
| `JWT_EXPIRES_IN` | No | `7d` |
| `CLIENT_URL` | Yes | Set after Vercel (Step 4), e.g. `https://your-app.vercel.app` |
| `ADMIN_EMAIL` | Yes | `admin@trustlink.ai` |
| `ADMIN_PASSWORD` | Yes | Strong password for admin login |
| `GEMINI_API_KEY` | No | Optional AI upgrade |
| `OPENAI_API_KEY` | No | Optional if no Gemini |
| Cloudinary / SMTP | No | Optional |

Deploy, then open:

```text
https://YOUR-SERVICE.onrender.com/api/health
```

**Expected:**

```json
{ "status": "ok", "name": "TrustLink AI API", "env": "production", "db": "connected" }
```

If `db` is not `connected`, fix `MONGODB_URI` / Atlas Network Access.

**Free tier note:** Service sleeps when idle. First hit after sleep can take 30–60 seconds.

---

## Step 4 — Frontend on Vercel

1. [Vercel](https://vercel.com) → **Add New** → **Project** → import the same GitHub repo  
2. Configure:

| Setting | Value |
|---------|--------|
| Root Directory | `client` |
| Framework | Vite (auto) |
| Build Command | `npm run build` (default) |
| Output Directory | `dist` (default) |

3. **Environment Variables:**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com/api` |

Important: include the `/api` suffix. No trailing slash after `api`.

4. Deploy.

You get a URL like `https://trustlink-ai.vercel.app`.

[`client/vercel.json`](client/vercel.json) already handles React Router (SPA rewrites).

---

## Step 5 — Connect CORS (critical)

On **Render**, set:

```env
CLIENT_URL=https://your-app.vercel.app
```

To allow both production and local frontend:

```env
CLIENT_URL=https://your-app.vercel.app,http://localhost:5173
```

**Redeploy** the Render service after changing `CLIENT_URL`.

If the browser console shows CORS errors, this variable is wrong or not redeployed.

---

## Step 6 — Post-deploy checklist

- [ ] `https://YOUR-API.onrender.com/api/health` → `ok` + `db: connected`
- [ ] Open Vercel URL → Home loads providers (wait if Render is waking up)
- [ ] Register or login:
  - Customer: `customer@trustlink.ai` / `Customer123!` (if you seeded)
  - Provider: `electrician@trustlink.ai` / `Provider123!`
  - Admin: `admin@trustlink.ai` / your `ADMIN_PASSWORD`
- [ ] Search `/providers` — city / category filters
- [ ] AI Assistant — get recommendations
- [ ] Provider profile — WhatsApp / Request
- [ ] Provider dashboard — availability toggle
- [ ] No CORS errors in DevTools

Local smoke test (API must be running locally):

```bash
cd server
npm run smoke
```

---

## Local vs production

| | Local | Production |
|--|--------|------------|
| DB | `mongodb://127.0.0.1:27017/trustlink-ai` | Atlas `mongodb+srv://...` |
| API | `http://localhost:5000` | `https://….onrender.com` |
| App | `http://localhost:5173` | `https://….vercel.app` |
| Client API URL | leave `VITE_API_URL` empty (Vite proxy) | set on Vercel to `…/api` |

---

## Common problems

| Problem | Fix |
|---------|-----|
| Health `db: disconnected` | Wrong Atlas URI / password encoding / Network Access |
| Frontend blank / API errors | Wrong `VITE_API_URL` (must end with `/api`); redeploy Vercel after changing env |
| CORS blocked | Set `CLIENT_URL` to exact Vercel origin; redeploy Render |
| First load very slow | Render free sleep — wait and refresh |
| Login works locally, not online | Seeded Atlas? Using Atlas URI on Render? |
| Seed fails Auth | Atlas user password / IP allowlist |

---

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@trustlink.ai` | `Customer123!` |
| Provider | `electrician@trustlink.ai` | `Provider123!` |
| Admin | `admin@trustlink.ai` | value of `ADMIN_PASSWORD` |

---

## Day 7 done when

1. Atlas has seeded data  
2. Render health returns `ok` + `connected`  
3. Vercel site talks to Render API  
4. You can login and run the main demo flows on the public URL  

You do **not** need Supabase/Prisma for Day 7. Stay on Mongo + Atlas.
