# Tomorrow's TODO

## 1. Deploy the backend (required before Twilio works)

Twilio needs a public URL to send webhooks to — localhost won't work.

**Quick option: Railway**
1. Go to railway.app → New Project → Deploy from GitHub repo
2. Point it at the `abierto` repo, select the `backend` folder
3. Add environment variables (see section 3 below)
4. Copy the public URL it gives you (e.g. `https://abierto-backend.up.railway.app`)

**Or: Render, Fly.io, DigitalOcean App Platform** — all work the same way.

---

## 2. Configure Twilio webhook

Once the backend is live:

1. Log in to [twilio.com/console](https://twilio.com/console)
2. Go to **Phone Numbers → Manage → Active Numbers**
3. Click your number
4. Under **Messaging**, set:
   - **Webhook URL:** `https://YOUR-BACKEND-URL/api/webhooks/twilio`
   - **Method:** HTTP POST
5. Save

### Enable WhatsApp on the same number
1. Go to **Messaging → Senders → WhatsApp Senders**
2. Click **Add New Sender** → select your existing Twilio number
3. Fill in the display name and business info
4. Set the same webhook URL: `https://YOUR-BACKEND-URL/api/webhooks/twilio`
5. Submit for approval (can take a few days for full approval — sandbox works immediately for testing)

---

## 3. Set environment variables on your server

Add these wherever you're hosting the backend:

```
TWILIO_AUTH_TOKEN=your_auth_token_from_twilio_console
JWT_SECRET=pick_a_long_random_string
FRONTEND_URL=https://your-frontend-domain.com
PORT=3005
```

**Where to find your Twilio Auth Token:**
Twilio Console → top of the homepage → Account Info section

---

## 4. Deploy the frontend

1. Go to [vercel.com](https://vercel.com) → New Project → import the repo
2. Set **Root Directory** to `frontend`
3. Add environment variable if needed (the API proxy in vite.config.js handles dev — in prod the frontend and backend need to share a domain or you update the API base URL)

> **Note:** Easiest setup is to serve the built frontend from the backend (Express static files) so they share one domain and no CORS issues. Can set this up tomorrow if needed.

---

## 5. Test the webhook

Once everything is deployed:

1. Go to your Admin Dashboard → find a business → add your own phone number to it
2. Text one of these to your Twilio number:
   - `OPEN`
   - `CLOSED`
   - `LATE`
   - `PRONTO`
   - `STATUS`
   - `HELP`
3. You should get a reply and see the status update on the map

For WhatsApp: send a WhatsApp message to `whatsapp:+1XXXXXXXXXX` (your Twilio number)

---

## 6. Add owner phone numbers

Once it's live, for each business:
1. Log in as admin → confirm the business exists
2. Give the owner their login code
3. Owner logs in → Business Info → Edit → enters their WhatsApp/cell number in **+1787XXXXXXX** format
4. From that point they can text to update their status

---

## What's already done ✓

- [x] SMS/WhatsApp webhook endpoint (`/api/webhooks/twilio`)
- [x] EN + ES commands (OPEN/ABIERTO, CLOSED/CERRADO, LATE/TARDE, etc.)
- [x] Twilio signature validation (uses `TWILIO_AUTH_TOKEN`)
- [x] Phone field on businesses table and owner dashboard
- [x] Billing system with past-due tracking and auto-inactivation
- [x] Bilingual toggle (EN/ES) with flag in navbar
- [x] Status badge fixes + 30s live refresh on homepage
- [x] Main photo selection in photo uploader
- [x] Description showing on homepage cards

---

## Questions to answer tomorrow

- Do you want the frontend and backend on the same domain (simpler) or separate?
- Do you have a domain name yet for Abierto?
- Do you want Stripe for automated billing or keep manual tracking for now?
