# TrustLink AI — Demo Script (Week 1 / Internship)

**Time:** ~5 minutes  
**Stack:** React + Express + MongoDB (local)

## Before you start

```bash
# Terminal 1
cd server
npm run seed
npm run dev

# Terminal 2
cd client
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000/api/health  

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@trustlink.ai` | `Customer123!` |
| Provider | `electrician@trustlink.ai` | `Provider123!` |
| Admin | `admin@trustlink.ai` | `Admin123!` |

---

## 5-minute walkthrough

### 1. Pitch (20 sec)
> “People find local help through WhatsApp groups. TrustLink AI is a marketplace for trusted electricians, plumbers, tutors, and more — with reviews, service requests, and AI recommendations.”

### 2. Home → Search (45 sec)
1. Open Home — show brand + “Find a provider”
2. Go to **Search**
3. City: `Lahore`, Category: Electrician (or leave open)
4. Open **SparkFix Electricians**

### 3. Customer flow (90 sec)
1. Login as **customer@trustlink.ai** → lands on `/dashboard/customer`
2. On SparkFix: show **WhatsApp** / **Call** (desktop sidebar) + mobile sticky bar
3. **Save favorite**
4. **Request service**: “Home wiring for 2 rooms, budget 5000” → optional **Also message on WhatsApp**
5. Optional: leave a review (if this account already reviewed, skip or use a new register)
6. Dashboard → show Favorites + Requests

### 4. AI Assistant (60 sec)
1. Open **AI Assistant**
2. Paste or tap example:  
   `I need an electrician for home wiring under PKR 5000 near Johar Town`
3. Click **Get recommendations**
4. Show ranked match (#1 SparkFix), score bar, reasons, and parse chips (category/city/area/budget)
5. Open provider → show **AI review summary**

Works even without Gemini/OpenAI key (heuristic mode).

### 5. Provider flow (45 sec)
1. Logout → login **electrician@trustlink.ai** → `/dashboard/provider`
2. Provider dashboard → **Requests**
3. **Accept** the pending request

### 6. Admin flow (45 sec)
1. Logout → login **admin@trustlink.ai** → `/dashboard/admin`
2. Show overview counts
3. **Providers** → approve any pending (e.g. FreshNest) or verify
4. **Reviews** → show moderation (delete one if asked)

### 7. Close (20 sec)
> “Full stack: auth, CRUD, search, reviews, requests, AI ranking, admin. Next week we harden this for real-market use.”

---

## Backup if something fails

| Issue | Fix |
|-------|-----|
| Empty providers | `cd server && npm run seed` |
| AI “no matches” | Use the exact Johar Town / electrician query above |
| Login fails | Re-seed; passwords in table above |
| CORS / API errors | Confirm server on `:5000`, client on `:5173` |
| No Gemini key | Fine — heuristic ranking still demos |
| Forgot password / no email | Demo: use **Open reset page**. Real mail: set Gmail SMTP in `server/.env` (App Password) |

---

## Day 1 verification (2026-07-29)

Local checks passed:

- [x] MongoDB connected + seed
- [x] API health
- [x] Client http://localhost:5173
- [x] Customer / provider / admin login
- [x] Search + filters
- [x] Provider detail + AI summary
- [x] Favorites + create request
- [x] Provider accept request
- [x] Admin stats + approve provider
- [x] AI recommend (heuristic fallback)

Minor fix applied: invalid Mongo IDs now return **400** instead of **500**.
