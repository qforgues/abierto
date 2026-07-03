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
3. **Android app** — a **TWA** (Trusted Web Activity) wrapper, package `com.abierto.app`, that just
   opens https://abierto.app full-screen for the Google Play Store. Lives in a separate repo
   (`qforgues/abierto-twa`) / the `~/ProjectArchive_ToDelete/abierto-build` folder. Only rebuilt
   when the app name/icon/splash/version changes — **content changes never need a new Play build.**

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
