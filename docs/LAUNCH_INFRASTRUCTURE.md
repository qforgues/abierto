# Launch Infrastructure (Roadmap Step 1)

The permanent acquisition system that sits behind every Abierto advertisement. Status:
**complete and in production** as of 2026-07-29.

Companions: `marketing/qr/README.md` (generating and printing codes) ·
`docs/CAMPAIGN_ATTRIBUTION.md` (what the numbers mean and their limits).

---

## The one rule

**A printed QR code never encodes a Google Play or App Store URL.**

Every code points at `abierto.app`, and the server decides where that goes. This is what
lets destinations and tracking change forever without reprinting physical material — and
it is why the iPhone app can launch later without touching a single poster.

---

## Public URLs

| URL | Purpose |
|---|---|
| `abierto.app/go/<campaign>` | **What the printed codes encode.** Short, low-density, human-readable |
| `abierto.app/download?src=<campaign>` | Canonical form; `utm_source` also accepted |
| `abierto.app/app`, `/get`, `/go` | Aliases — same handler, no extra redirect hop |
| `abierto.app/download/android` | Explicit "I have Android" from the landing page |
| `abierto.app/download/ios` | Explicit "I have iPhone" |
| `abierto.app/download/web` | Explicit "just use the website" |
| `abierto.app/download/status` | Public config readout, used by `qr:verify` |

No DNS change was needed — these are paths on the existing domain.

## What each visitor gets

| Visitor | Today | After the iPhone app ships |
|---|---|---|
| Android | 302 → Google Play, campaign attached | unchanged |
| iPhone / iPad | Abierto "coming soon" page + Add-to-Home-Screen steps | 302 → App Store |
| Desktop / unknown | Landing page (Android / iPhone / web) | same, with a live iPhone button |
| **Already has Abierto** | 302 → app content, counted separately | unchanged |
| Link-preview bots | Landing page, logged as `bot` | unchanged |

Pages are **server-rendered HTML** (like `/privacy`), not React — they must paint on ferry
and hotel wifi without waiting for a bundle.

Redirects are **302 + `Cache-Control: no-store` + `Vary: User-Agent`**, never 301. A 301 to
Google Play would be cached in browsers and at Cloudflare essentially forever, permanently
defeating the entire point of the indirection layer.

---

## Switching iPhone traffic on

**One value.** Set `IOS_APP_STORE_URL` on Render (or `IOS_STORE_URL` in
`backend/config/appLinks.js`) and restart. Every code already printed and hanging in a
ferry terminal starts sending iPhone users to the App Store. No reprint, no redeploy of
artwork, nothing else to change.

---

## Where the code lives

| File | Role |
|---|---|
| `backend/config/appLinks.js` | **Single source of truth** — store URLs, campaign registry, platform detection, campaign sanitising, synthetic-traffic cutoff |
| `backend/routes/download.js` | The routing itself + the landing/iPhone pages + tracking |
| `backend/routes/analytics.js` | `GET /api/analytics/campaigns` (admin) |
| `backend/routes/qr.js` | `GET /api/qr` + downloads (admin) |
| `backend/utils/retention.js` | Analytics retention, with the misconfiguration guard |
| `backend/routes/health.js` | Liveness + database readiness |
| `frontend/src/pages/AdminDashboard.jsx` | Traffic → Download Campaigns, and the QR Codes tab |
| `scripts/generate-qr.js` / `verify-qr.js` | QR generation and pre-print verification |
| `marketing/qr/` | The generated print assets + manifest |

**Mounting order matters.** The download router is mounted in `app.js` *before*
`express.static` and the SPA `*` fallback. Move it after and React Router swallows
`/download` and `/go/...` and renders the 404 page.

---

## Adding a campaign

1. Add the slug to `CAMPAIGNS` in `backend/config/appLinks.js` with a `label`, a `usage`
   (where the code physically goes) and a `note`.
2. `npm run qr -- <slug>`
3. `npm run qr:verify -- --live`
4. Deploy, then download the SVG from **/admin → QR Codes**.

An unregistered-but-well-formed slug still tracks correctly if someone prints one before
step 1 — the dashboard just flags it as "(unregistered)".

---

## Health and monitoring

| Endpoint | Type | Behaviour |
|---|---|---|
| `/api/health`, `/health` | **Liveness** | `{status, timestamp}`. No database access |
| `/api/health/ready` | **Readiness** | Runs a real query; reports latency; **503** if the database is unreachable |

Both the Dockerfile `HEALTHCHECK` and `render.yaml`'s `healthCheckPath` point at
**liveness**, deliberately. If the container probe queried Turso, a database blip would be
read as a dead container and trigger a restart loop — restarting the app cannot fix
someone else's database. Point real alerting at `/ready`.

---

## Admin dashboard

**Traffic → Download Campaigns** — scan reporting. Four fixed summary cards (Today / Week /
Month / All Time) that never change with the selected range, then a filterable detail
section: range chips (7 / 30 / 90 days / Year / All), a hoverable day-by-day trend, and
campaign rows that expand to show that campaign's device split, destinations and its own
trend. A refresh button avoids a full page reload.

**QR Codes** — the print assets in plain language. Per campaign: where it goes, what each
device does when scanned, the live URL, and SVG/PNG downloads named
`abierto-qr-<campaign>.svg`. Nobody needs to know a repo path.

---

## Testing

```bash
cd backend && npx jest        # 126 tests, 5 suites
npm run qr:verify -- --live   # 48 checks against production
```

| Suite | Covers |
|---|---|
| `download.test.js` | Device routing, aliases, campaign sanitising, TWA classification, cache headers, tracking writes, verification exclusion |
| `analytics-campaigns.test.js` | Exclusion in both directions, range filtering, per-campaign drill-down, figures reconcile to stored rows |
| `qr-library.test.js` | Listing shape, human-readable filenames, admin auth, path-traversal rejection |
| `retention.test.js` | Window resolution, cutoff maths, and that a misconfiguration deletes **nothing** |
| `health.test.js` | Both paths, JSON not SPA HTML |

The pre-print gate is `npm run qr:verify -- --live`. A failing `/go/...` check usually means
the route isn't deployed yet.

---

## Security notes

- Campaign slugs are bounded to `^[a-z0-9][a-z0-9_-]{0,39}$`; anything else becomes
  `invalid`. Everything is parameterised at the SQL layer regardless.
- QR downloads validate campaign and format against fixed allow-lists before touching the
  filesystem, so neither can walk out of `marketing/qr/`.
- `?days=` is whitelisted to a fixed set of ranges.
- Analytics store no raw IP, no User-Agent string, no cookies, and referrers without their
  query string. No third-party analytics vendor, no tracking pixel, no consent banner.

---

## Known limits

1. **TWA attribution ceiling** — `X-Requested-With` is a reliable positive but not a
   reliable negative on newer Chrome, so some installed users still land in the Android
   bucket. Options are documented in `docs/CAMPAIGN_ATTRIBUTION.md`.
2. **iPadOS 13+** reports itself as "Macintosh" and is indistinguishable from a Mac
   server-side. Those visitors get the desktop landing page, which offers the iPhone
   option anyway.
3. **Render free plan** — the service sleeps after 15 minutes without traffic and takes
   about a minute to wake. That hits the first visitor after *every* quiet gap, not just
   the first ever. Roughly $7/month removes it; deliberately deferred until there is
   revenue to justify it.
4. **Bot detection is User-Agent based** and always will be imperfect. Treat scan counts
   as a strong directional signal; lean on unique devices and Play installs when a number
   really matters.
