# CLAUDE.md — Abierto

Guidance for Claude (and humans) working in this repo.

## What this is

**Abierto** ("¿Abierto?" = "Is it open?") is a mobile-first web app that shows which local
businesses are **open right now** on the Puerto Rican islands of **Vieques** and **Culebra**,
plus a community **events** calendar. Business owners keep their own open/closed status current.
The audience is locals + tourists; content is **bilingual (English + Spanish)**.

## Architecture (the "trench coat")

Three layers — know which one a change belongs to:

1. **Website (this repo)** — the real app. Changes here go live via `git push` (see Deploy).
   - `frontend/` — **Vite + React** SPA (React Router). Build output is served by the backend.
   - `backend/` — **Express** API (`backend/app.js`). Serves the built frontend + `/api/*`.
   - **Database: Turso (libSQL/SQLite)** in production; automatic **local SQLite fallback** in dev.
2. **Hosting** — deployed to **Render.com** (`render.yaml`), auto-deploys on push to `main`.
   **Cloudflare sits in front as CDN/proxy** — it is NOT Cloudflare Pages.
3. **Android app** — a **TWA** (Trusted Web Activity), package `com.abierto.app`, that opens
   https://abierto.app full-screen for Google Play.

   > ### ⛔ THE RULE: GitHub is the only source of truth.
   > **The app is `android/` IN THIS REPO. Build from a clean checkout of `main` and from
   > nowhere else.** An Android project outside this repository is NOT the app, however new
   > it looks. On 30 Jul 2026 a build made from `abierto-build/twa-project`'s counterpart —
   > an unshipped hand-rolled rewrite that looked newer by every signal — shipped as
   > versionCode 7 and **crashed on launch for every user**. Read `docs/ANDROID_RELEASE.md`
   > before touching anything Android.

   - It is a **real TWA**: `com.google.androidbrowserhelper` `LauncherActivity`, **zero
     custom Java**. If you find yourself editing an `Activity`, you are in the wrong project.
   - **Never upload anything that hasn't passed `./scripts/verify-release.sh`**, and never
     upload anything you have not installed and opened yourself. Compiling is not working —
     that assumption is exactly what caused the outage.
   - Release: `git pull` → bump `versionCode`/`versionName` (must exceed what is **live on
     Play**, not the repo) → `./scripts/build-release.sh` (prompts for the keystore password)
     → `./scripts/verify-release.sh` → run it → upload. Full checklist in
     `docs/ANDROID_RELEASE.md`.
   - **Launcher icons:** `python3 scripts/generate-launcher-icons.py` regenerates every
     density plus adaptive layers from `frontend/public/icon-512.png`, the master artwork
     shared with the website, PWA and Play Store listing icon.
   - **Store listing** assets need **no rebuild** at all: see `marketing/store/README.md`.
   - **Pending:** targetSdk must reach **36 before 31 Aug 2026** (currently 35) or Play
     blocks updates. Ship it as its own device-tested release — bundling it with other
     changes is what went wrong last time.

## Commands

```bash
# Backend (Express) — dev server on port 3005
cd backend && npm install && npm run dev      # nodemon app.js

# Frontend (Vite) — dev server on port 5200, proxies /api,/tiles,/uploads -> :3005
cd frontend && npm install && npm run dev

# Production build (what Render runs)
npm run build            # root: installs both, builds frontend
node backend/app.js      # start (serves built frontend + API)
```

Open **http://localhost:5200** for the dev app.

## Local dev setup

Create `backend/.env` (git-ignored):

```
NODE_ENV=development
PORT=3005
JWT_SECRET=local-dev-only-secret
ADMIN_PASSWORD=local123
```

**No `TURSO_*` vars locally** → the DB layer (`backend/db/database.js`) falls back to a local
SQLite file at `backend/db/abierto.db`, completely separate from production. The app **creates
all tables itself on startup** (`initAndStart()` in `app.js`) — do NOT rely on `db/schema.sql`
(it's an older/partial copy and its `db:init` script has a statement-ordering bug).

Local admin login: username `admin`, password = `ADMIN_PASSWORD` (`local123`).

## Deploy (how "push to live" works)

`git push origin main` → GitHub → **Render auto-builds & deploys** (~1–5 min) → live at
abierto.app (through Cloudflare). No Play Store involved for website changes. Verify a deploy
landed by watching the hashed bundle name in the live HTML (`/assets/index-*.js`) change.

## Key concepts

- **Roles / auth** (`backend/routes/apiAuth.js`, JWT in cookie):
  - **admin** — username + password (`/auth/admin/login`); full control via `AdminDashboard`.
  - **business owner** — 3-char **code** (`/auth/business/login`); manages their own listing (`/owner`).
  - **event coordinator** — code + password (`/auth/coordinator/login`); manages **their own** events (`/coordinator`). Admin creates coordinators (`routes/coordinators.js`).
- **Status** is computed server-side in `routes/businesses.js` (`computeStatus`): manual status +
  a `quick_override` flag + `business_hours` + current Vieques time. Open statuses:
  Open / Opening Late / Back Soon.
- **Islands** (`frontend/src/constants/islands.js`): `vieques`, `culebra` — each has center/zoom/bounds.
- **Categories & icons**: category list lives in a few places (`HomePage.jsx` filter pills,
  `RegisterPage.jsx` add-business picker). **Icons are custom SVGs in
  `frontend/src/components/CategoryIcon.jsx`** (keyed by category name; `currentColor`). Use this
  component for any category/UI icon — **do not add emoji** to UI (we replaced them all).
- **Map**: `frontend/src/components/MapView.jsx` uses `@react-google-maps/api` with
  `VITE_GOOGLE_MAPS_API_KEY` (set at build time on Render).

## Download / campaign routing (launch infrastructure — Roadmap Step 1, COMPLETE)

Printed QR codes **never** point at Google Play or the App Store — they point at
`abierto.app/go/<campaign>`, so destinations and tracking can change without reprinting.
**Full detail: `docs/LAUNCH_INFRASTRUCTURE.md`.**

- **`backend/config/appLinks.js`** — single source of truth: store URLs, the campaign
  registry (with `usage`/`note` per campaign), platform detection, the synthetic-traffic
  cutoff. **When the iPhone app ships, set `IOS_APP_STORE_URL` on Render (or `IOS_STORE_URL`
  here) and every existing printed code starts working.**
- **`backend/routes/download.js`** — `/download`, `/go/:campaign`, `/app`, `/get`, plus
  `/download/{android,ios,web}`. Server-rendered HTML (like `/privacy`), so it paints on bad
  ferry wifi without booting React. Mounted in `app.js` **before** `express.static` and the
  SPA `*` fallback — move it after and React Router eats these paths.
- Redirects are **302 + `no-store` + `Vary: User-Agent`**, never 301, so Cloudflare can't
  pin one device's destination and serve it to another.
- **"Already Had Abierto"** — `X-Requested-With: com.abierto.app` is checked *before* the
  User-Agent, so an installed TWA user is never counted as a new Android acquisition. They
  get app content, not a Play listing they can't use.
- **Tracking:** `download_clicks` (campaign / platform / destination / date / salted IP hash
  / referer-without-query). No raw IP, no UA string. Admin: Traffic → *Download Campaigns*
  (`GET /api/analytics/campaigns?days=…`), with range filtering and per-campaign drill-down.
  Retention 400 days via `utils/retention.js` — a bad `ANALYTICS_RETENTION_DAYS` deletes
  **nothing** rather than falling back to a default.
- **Analytics honesty:** rows before `SYNTHETIC_CUTOFF` (pre-launch testing) and bot hits
  are **filtered from reporting, never deleted**, and the panel says how many. Automated
  checks send `X-Abierto-Check: 1` and are never recorded at all.
- **QR codes:** `npm run qr` regenerates, `npm run qr:verify [-- --live]` proves they decode
  to the right URL before printing. Print assets download from **/admin → QR Codes**. See
  `marketing/qr/README.md`. Generate them mathematically — never with an image model.
- **Health:** `/api/health` + `/health` are liveness (no DB); `/api/health/ready` runs a real
  query and 503s if the database is down. Container probes point at liveness on purpose.

## Status freshness, offline, and billing

- **Status by WhatsApp / SMS** (`backend/routes/webhooks.js`) — an owner texts `OPEN` /
  `ABIERTO` / `CLOSED` / `LUNCH` / `SEASON` and their public status changes instantly. Code is
  done and tested; it needs `TWILIO_AUTH_TOKEN` on Render, a Twilio WhatsApp sender, and
  `businesses.phone` populated (**0 of 25 today** — that's the real blocker). Full setup +
  the two silent bugs that used to break it: **`docs/WHATSAPP_STATUS.md`**.
  - Match phones on the **last 10 digits** — the signup form stores `(787) 555-1234`, Twilio
    sends `whatsapp:+17875551234`.
  - Any manual status set outside the schedule **must** set `quick_override = 1`, or
    `computeStatus` silently discards it for the 92% of businesses that have hours.
- **Offline** (`frontend/public/sw.js`) — real caching now: cache-first for `/assets` and
  `/uploads`, network-first with a stamped cache fallback for `GET /api/*`. Vieques signal is
  patchy and someone who installs at the ferry terminal must not open a blank app.
  **Cached data is never presented as live** — the SW tags it with `X-Abierto-From-Cache` +
  `X-Abierto-Cached-At`, `api/client.js` exposes `onFreshnessChange`, and
  `components/OfflineNotice.jsx` shows an unmissable banner with the age. `/download`, `/go`
  and `/api/analytics` are deliberately never cached.
- **Billing toggle** — `app_settings.billing_enabled`, **default off**. While off, listing a
  business is free and the admin Billing tab says so plainly instead of implying money is
  owed. Flip it in admin → Settings when subscriptions actually start.

## Gotchas / conventions

- **Never commit** `backend/.env` or `backend/db/*.db` (git-ignored). Demo/seed data belongs only
  in local sandbox, never on production.
- **No emojis in UI** — use `CategoryIcon`. Match the existing bilingual pattern (`name_es`,
  `description_es`, `t.categories[...]` via `LangContext`).
- **Bilingual**: `frontend/src/context/LangContext.jsx` holds all translations + `toggle`. The
  US/PR flag toggle is `components/LangToggle.jsx` (both flags shown, active one glows).
- **Known issue — map "For development purposes only" watermark**: the Google Maps key
  (named "abierto", in GCP project *MyEasyApp*/`claudeclaw-mcp`) is configured correctly but the
  map won't verify billing. It's a **billing-account** fix (payment method / verification) on the
  linked billing account — not a code bug. Map still renders under the watermark.

## Google Play / production status

Personal Play developer account → production access requires a **closed test with ≥12 real,
engaged testers for 14 continuous days**, plus evidence of feedback-driven updates. Prior
production applications were **rejected for tester engagement** (not code). The path forward is
real installs + genuine 14-day usage, then reapply. TWA signing key: `abierto-key.jks` (backed up
in Google Drive + `~/env.bak/abierto`) — losing it means never updating the app.
