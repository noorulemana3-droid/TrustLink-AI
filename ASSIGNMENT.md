# Assignment guidelines — Swagger, Sentry, OpenAI

TrustLink AI already has these three integrations. Follow this document to **configure, demo, and screenshot** them.

Start the app first:

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000  
- Demo login: `customer@trustlink.ai` / `Customer123!`

Do **not** commit `.env`. Do **not** paste DSN or API keys into chat or the report appendix as screenshots of secrets.

---

## 1. Swagger (API documentation)

### What it is
Interactive docs for important REST endpoints (auth, providers, requests, reviews, favorites, AI, admin, health, Sentry sample).

### Open it
- http://localhost:5000/api/docs  
- or http://localhost:5173/api/docs  
- Raw spec: http://localhost:5000/api/docs.json  

Footer → **API docs** also opens this page.

### Screenshot 1 — Swagger home
Show the TrustLink AI title, tags, and endpoint list.

### Try a public endpoint
1. Expand **Health** → `GET /api/health`
2. Click **Try it out** → **Execute**
3. You should see `status: "ok"` and `"docs": "/api/docs"`

### Try a protected endpoint (JWT)
1. Expand **Auth** → `POST /api/auth/login`
2. **Try it out**, body:

```json
{
  "email": "customer@trustlink.ai",
  "password": "Customer123!"
}
```

3. **Execute** → copy the `token` value  
4. Click **Authorize** (top of Swagger)  
5. Paste: `Bearer <token>`  (or just the token if the UI already says Bearer)  
6. Expand **Auth** → `GET /api/auth/me` → **Execute**  
7. You should see the logged-in user

### Screenshot 2 — authorized request
Show `GET /api/auth/me` or `GET /api/requests/my` returning 200 after Authorize.

### Other useful Try-it-out calls

| Method | Path | Auth? | Purpose |
|--------|------|-------|---------|
| GET | `/api/providers` | No | Search providers |
| POST | `/api/ai/recommend` | No | AI recommendations |
| GET | `/api/requests/my` | Yes | Customer requests |
| GET | `/api/admin/stats` | Yes (admin) | Admin only |

Admin login for Swagger: `admin@trustlink.ai` / `Admin123!`

---

## 2. Sentry.io (monitoring + error tracking)

### What it is
Production-style error tracking. Real API errors are sent to Sentry. There is also a **sample error** endpoint so you can prove it works.

### Create a Sentry project (once)
1. Go to https://sentry.io and sign up (free)  
2. Create a project  
3. Platform: **Node.js** → **Express** (or just Node.js)  
4. Copy the **DSN** (looks like `https://xxxx@xxxx.ingest.sentry.io/xxxx`)

### Put DSN in env
Edit `server/.env` (never commit this file):

```env
SENTRY_DSN=https://YOUR_DSN_HERE
```

Restart the API (`Ctrl+C`, then `npm run dev`).

On startup you should see:

```text
[TrustLink] Sentry error tracking enabled
```

If you see `SENTRY_DSN not set`, the DSN is missing or the server was not restarted.

### Capture the sample error
With the API running:

```bash
npm run sentry:sample
```

Or open: http://localhost:5000/api/debug/sentry  

Expected JSON:

```json
{
  "message": "Sample error captured for Sentry verification",
  "sentry": {
    "configured": true,
    "captured": true
  }
}
```

### Verify in Sentry dashboard
1. Sentry → your project → **Issues**  
2. Wait 10–30 seconds, refresh  
3. You should see:  
   **TrustLink AI sample Sentry error — assignment verification**

### Screenshots for the report
1. `server/.env` with `SENTRY_DSN=` visible but **blur the secret**  
2. Terminal: `Sentry error tracking enabled`  
3. Browser/JSON from `/api/debug/sentry` with `"captured": true`  
4. Sentry **Issues** page showing the sample error  

### If Issues is empty
- DSN wrong or extra spaces  
- API not restarted after saving `.env`  
- Ad-block / VPN blocking ingest (try another network)  
- Wrong Sentry org/project  

---

## 3. OpenAI (optional AI — already integrated)

### What it adds
TrustLink **always** ranks providers with its own scoring engine.  
If `OPENAI_API_KEY` is set, OpenAI (`gpt-4o-mini`) improves:

- Natural-language parse (`POST /api/ai/parse`)  
- AI recommend query understanding (`POST /api/ai/recommend`)  
- Review summaries (`GET /api/ai/reviews/:id/summary`)  

If the key is missing, heuristic fallback still works (required for demo without paid credits).

### Optional setup
1. Create a key at https://platform.openai.com/api-keys  
2. In `server/.env`:

```env
OPENAI_API_KEY=sk-...
```

3. Restart the API  
4. Check http://localhost:5000/api/health → `"ai": { "openai": true, "gemini": false }`

### Demo without spending money
You do **not** need OpenAI for the assignment to pass. Screenshot:

- AI Assistant page → query: `electrician under 5000 near Johar Town`  
- Result: **Best Match** + reasons  
- Health JSON showing `"ai"` block  
- Swagger `POST /api/ai/recommend` Try it out  

Alternative: `GEMINI_API_KEY` instead of OpenAI (same hybrid path).

---

## 4. Suggested report / viva wording

> TrustLink AI documents its REST API with **Swagger UI** at `/api/docs`.  
> **Sentry.io** is integrated for error tracking; `GET /api/debug/sentry` was used to capture a sample exception, which appeared in the Sentry Issues dashboard.  
> **OpenAI** is optionally used for NL parsing and review summaries; ranking still works with a heuristic fallback when no LLM key is set.

---

## 5. Quick checklist

- [ ] API running  
- [ ] Swagger opens at `/api/docs`  
- [ ] Login via Swagger + Authorize + `/api/auth/me` works  
- [ ] `SENTRY_DSN` in `server/.env` + restart  
- [ ] `/api/debug/sentry` returns `"captured": true`  
- [ ] Sample error visible in Sentry Issues  
- [ ] AI recommend works (with or without OpenAI key)  
- [ ] `.env` not committed  
