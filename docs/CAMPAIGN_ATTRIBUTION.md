# Campaign attribution — how it works, and one gap to close in Step 2

Companion to `marketing/qr/README.md` (which covers generating and printing the codes).
This document covers **what we can and can't measure**, and the one known blind spot.

---

## Where to see the numbers

**Admin dashboard → Traffic tab → "Download Campaigns"** (log in at `/admin`).

You get, with link-preview bots filtered out of the headline figures:

- Scans today / this week / this month / all time
- **By Campaign** — scans and unique devices per campaign, so `ceiba-ferry` and
  `ferry-wifi` are directly comparable
- **By Device** — Android vs iPhone vs desktop
- **Where They Went** — sent to Google Play, shown the iPhone page, chose the web app, etc.

Two independent sources, worth understanding because they answer different questions:

| Source | Where | Answers |
|---|---|---|
| `download_clicks` (ours) | Traffic tab | **How many people scanned**, from which campaign, on what device |
| Google Play referrer | Play Console → Acquisition → *Custom URLs / referrers* | **How many actually installed**, per campaign |

Ours measures interest. Play measures conversion. The gap between them is the story:
lots of scans and few installs means the poster works but the store listing doesn't.

Every Android redirect carries `utm_source=abierto&utm_medium=qr&utm_campaign=<campaign>`
into Play automatically — nothing to configure in Play Console.

---

## The known gap: installed-app users are invisible to Play

**This is the one thing to fix in Step 2.**

`backend/public/.well-known/assetlinks.json` delegates *all* `abierto.app` URLs to the
Android app (`com.abierto.app`) via Digital Asset Links. That's what makes the TWA work.

The side effect: **if someone already has the Abierto app installed, scanning a QR code
opens the app instead of the browser.** Android never reaches our `/go/...` redirect in
Chrome, so:

- ✅ The user gets a fine experience — they already have the app, which is the goal
- ✅ We still log the scan in `download_clicks` (the TWA loads the URL through us)
- ❌ Play Console sees no referrer, because there's no install to attribute

**Practical effect:** Play's campaign numbers undercount nothing that matters (an existing
user can't install twice), but our scan counts and Play's install counts are measuring
different populations. Don't expect them to reconcile — and don't read "scans ≫ installs"
as a broken funnel until you've accounted for repeat scans by people who already have it.

`unique_devices` in the Traffic tab is the better denominator for that reason.

### Options for Step 2

1. **Do nothing** (recommended for now). The behaviour is correct for the user; only the
   reporting is fuzzy, and `unique_devices` mostly covers it.
2. **Exclude `/go/*` and `/download*` from the TWA's intent filter** so those URLs always
   open in the browser. Cleanest attribution, but it needs a `twa-project` rebuild, a
   `versionCode` bump and a new Play release — and every existing installed user keeps the
   old filter until they update.
3. **Detect the TWA server-side and record it as its own platform bucket.** TWA requests
   arrive with `X-Requested-With: com.abierto.app` on many Android versions. Cheap, no app
   rebuild, and it would let the Traffic tab report "already had the app" as a distinct
   row. **This is the best value for effort** — worth doing in Step 2.

---

## What we deliberately do not collect

`download_clicks` stores: campaign, platform bucket, destination, date, a salted SHA-256
hash of the IP (first 16 hex chars), and the referrer **with its query string stripped**.

It does **not** store raw IP addresses, User-Agent strings, cookies, device IDs, or
anything that identifies a person. The IP hash exists solely to count unique devices; it
is salted with `JWT_SECRET` and is not reversible to an IP in any practical sense.

There is no third-party analytics vendor, no tracking pixel, and nothing that would
require a cookie consent banner.

---

## Retention

`initAndStart()` prunes `page_views` and `download_clicks` older than **400 days**
(≈13 months) on every boot. That keeps day/week/month/season and year-over-year campaign
comparisons fully intact while bounding table growth and not holding pseudonymous data
longer than it's useful.

Override with `ANALYTICS_RETENTION_DAYS` on Render. Values below 30 are **ignored** with a
warning, so a typo can't mass-delete analytics history.

---

## Bot filtering, and why counts can still be soft

Link-preview fetchers — WhatsApp, Facebook, Slack, iMessage, search crawlers — hit any URL
that gets shared and would otherwise inflate scan counts. They're detected by User-Agent
(`backend/config/appLinks.js` → `BOT_RE`), served the landing page rather than a Play
redirect (so they can't pollute Play's attribution), and recorded under `platform = 'bot'`
so they're visible but excluded from headline numbers.

User-Agent detection is a hygiene measure, not a guarantee: a bot that lies about its
User-Agent will be counted as a real scan. At the volumes this campaign operates at, treat
scan counts as a strong directional signal rather than an exact tally — and lean on
`unique_devices` and Play installs when a number really matters.
