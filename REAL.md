# Make TrustLink real (production checklist)

The app features already work. To run it as a **real product**, configure the environment — especially **email** for forgot password.

## What already works (no rewrite)

- Register (customer / provider)
- Login (JWT)
- Logout
- Forgot password + reset password (**real Gmail SMTP only**)
- Change password (Profile / provider Account)
- Search, reviews, favorites, requests, WhatsApp, demo payments, AI recommend

Seeded `@trustlink.ai` emails are **not real inboxes**. Register with Gmail/Yahoo/etc.

---

## 1. Database (Atlas)

`server/.env`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/trustlink-ai?retryWrites=true&w=majority
```

Atlas → Network Access → allow `0.0.0.0/0` (or lock to your server IPs).

## 2. Secrets

```env
NODE_ENV=production
JWT_SECRET=a-long-random-string-not-the-dev-one
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-app.vercel.app
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=a-strong-admin-password
```

Never commit `.env`. Rotate `JWT_SECRET` if it was shared.

## 3. Real forgot-password email (same idea as ExpenseIQ AI)

ExpenseIQ uses **Supabase Auth**: you configure the project **once**, then **every user** gets a reset email at whatever address they signed up with.

TrustLink is the same pattern, without switching to Supabase:

| | ExpenseIQ AI | TrustLink AI |
|--|----------------|--------------|
| User database | Supabase Auth | Mongo `User` |
| App sender (set once) | Supabase built-in mail | `SMTP_USER` + App Password |
| Who receives the link | **Any** registered email | **Any** registered email |

`SMTP_USER` is **not** “the only person who can reset”. It is TrustLink’s **sending mailbox** (like ExpenseIQ’s hidden sender). After that one-time setup:

- Ali registers with `ali@yahoo.com` → reset goes to Yahoo  
- Sara registers with `sara@gmail.com` → reset goes to Gmail  
- Ahmed registers with `ahmed@outlook.com` → reset goes to Outlook  

You do **not** create an App Password per user.

### One-time sender setup (Gmail)

1. Turn on [2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification)
2. Create an [App Password](https://myaccount.google.com/apppasswords) for **Mail**
3. Set in `server/.env` **and** on Render:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=trustlink.app.sender@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM="TrustLink AI <trustlink.app.sender@gmail.com>"
```

Spaces in the 16-character password are OK — they are stripped automatically.

Restart the API. You should see:

```text
[TrustLink] SMTP ready — reset emails go to real inboxes (...)
```

```bash
npm run test:smtp
npm run test:smtp -- anyone@example.com
```

### Test like ExpenseIQ

1. Register users with **different real inboxes** (Gmail / Yahoo / Outlook — not `@trustlink.ai`)
2. Logout → Forgot password → enter **that user’s email**
3. Open the mail on that inbox → Reset password → login

If SMTP is missing, Forgot password shows a setup warning and the API returns 503.

## 4. Frontend (Vercel)

```env
VITE_API_URL=https://YOUR-API.onrender.com/api
```

Redeploy after changing env. `CLIENT_URL` on the API must match the live frontend so reset links open the right site.

## 5. Payments

Current pay flow is a **demo** (JazzCash/EasyPaisa/card mock, no real money).  
For real money later: JazzCash merchant or Stripe, same `POST /api/requests/:id/pay` hook.

## 6. User flow you should demo

1. **Register** as customer with a real email + `03XXXXXXXXX`
2. Search provider → Request service
3. **Pay** (demo) or skip
4. Logout → **Forgot password** → email link → new password → **Login**
5. Profile → **Change password**
6. Register a **provider** → create business profile → wait for admin approval
7. Admin approves → provider appears in search

## 7. Local vs production

| | Local | Production |
|--|--------|------------|
| `NODE_ENV` | `development` | `production` |
| Forgot password | **Real Gmail SMTP** | **Real Gmail SMTP** |
| Demo seed accounts | OK for login testing | Prefer real signups |

---

If SMTP is missing, forgot password will not work. Set Gmail App Password first.
