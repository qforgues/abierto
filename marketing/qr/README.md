# Abierto campaign QR codes

**The one rule: a printed QR code never points at Google Play or the App Store.**
Every code encodes an `abierto.app` URL, so where it sends people — and what we learn from
it — can change forever without reprinting a single poster.

## The URLs

| Campaign | QR encodes | Where it's for |
|---|---|---|
| `ceiba-ferry` | `https://abierto.app/go/ceiba-ferry` | Ceiba ferry terminal |
| `vieques-ferry` | `https://abierto.app/go/vieques-ferry` | Vieques ferry arrival |
| `ferry-wifi` | `https://abierto.app/go/ferry-wifi` | Abierto Free Ferry Wi-Fi |
| `business` | `https://abierto.app/go/business` | Participating business window/counter |
| `business-card` | `https://abierto.app/go/business-card` | Business cards |
| `lodging` | `https://abierto.app/go/lodging` | Hotels / Airbnb / guesthouses |
| `transport` | `https://abierto.app/go/transport` | Rental / taxi partners |
| `social` | `https://abierto.app/go/social` | Social / general |

The campaign registry lives in **`backend/config/appLinks.js`** — that's the single source of
truth. Adding a campaign there and re-running `npm run qr` is all it takes.

## Where each scan goes

| Device | Today | After the iPhone app launches |
|---|---|---|
| Android | 302 → Google Play, tagged with the campaign | unchanged |
| iPhone / iPad | Abierto "coming soon" page + Add-to-Home-Screen steps | 302 → App Store |
| Desktop / unknown | Abierto landing page (Android / iPhone / web) | same, with a live iPhone button |
| Link-preview bots | landing page, logged separately | same |

**Switching iPhone traffic to the App Store is one value.** Set `IOS_APP_STORE_URL` on Render
(or edit `IOS_STORE_URL` in `backend/config/appLinks.js`) and restart. Every code already
printed and hanging in a ferry terminal starts working immediately. No reprint.

## Regenerating

```bash
npm run qr                  # all campaigns
npm run qr -- ceiba-ferry   # just one
npm run qr -- --list        # show campaigns + URLs, write nothing
```

Codes are generated mathematically by the `qrcode` library (ISO/IEC 18004, Reed–Solomon).
Never draw one by hand or with an image generator.

Settings, and why:
- **Error correction `Q` (25%)** — survives sun, salt spray and scuffing on a ferry dock
  without inflating the module count enough to hurt scanning at a distance.
- **4-module quiet zone** — the spec minimum. Printers crop; do not reduce it.
- **Pure black on white** — brand-coloured codes measurably scan worse in bad light. The
  Abierto logo goes *next to* the code on the artwork, never inside it.

Current codes are QR version 3–4 (29×29 to 33×33 modules) — deliberately low density, so
they still scan from across a terminal waiting area.

## Verifying — do this before every print run

```bash
npm run qr:verify           # decode every PNG, check against the manifest
npm run qr:verify -- --live # ALSO check the live redirects actually work
```

`qr:verify` decodes the generated PNGs with **jsQR** — a real scanner implementation, not a
checksum — and asserts each decodes to *exactly* the expected URL. It also checks the SVG
(the file that goes to the printer) still matches the symbol, and that no code was left
pointing at a stale base URL.

`--live` additionally fetches each URL with Android, iPhone and desktop user-agents and
asserts Android gets a 302 to Play carrying the right campaign, and that iPhone never gets
a dead App Store link.

**A failing `--live` check on a `/go/...` URL usually means the route isn't deployed yet.**

## Files

Each campaign gets a folder:

```
marketing/qr/<campaign>/
  abierto-<campaign>.svg          ← send THIS to the printer (vector, any size)
  abierto-<campaign>-1024.png     ← web / preview
  abierto-<campaign>-2048.png     ← high-resolution raster fallback
```

`manifest.json` records what each code encodes, its QR version, module count, error
correction level and quiet zone — i.e. exactly what was printed.

## Print guidance

- Use the **SVG**. It scales to any size with no quality loss.
- Minimum printed size ~2 cm (0.8 in) for close-range (business card, table tent).
  For a poster scanned from 2–3 m, 10 cm+.
- Keep the white quiet zone. Do not crop to the edge of the pattern, and do not place the
  code on a photo or coloured background — put it on solid white.
- Print a test, scan it with an actual phone, then print the run.

## Reading the results

Admin dashboard → **Traffic** tab → *Download Campaigns*. Shows scans per campaign, unique
devices, device split and where people ended up. Bot/link-preview hits are filtered out of
the headline numbers.
