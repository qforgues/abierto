# Abierto Public API (`/api/v1`)

A versioned, read-only API of Vieques/Culebra businesses and their **live open/closed
status**. This is the stable contract other products (e.g. Vieques Room Service) consume.
**Field names are stable — do not rename without a version bump.**

Base URL: `https://abierto.app`

## Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/businesses` | array of all active businesses |
| GET | `/api/v1/businesses/:id` | one business (404 if not found / inactive) |

## Business shape

```json
{
  "id": 1,                                 // stable, never reused — the join key
  "name": "La Palma Cafe and Bar",
  "name_es": null,
  "category": "Cafe",                      // Restaurant | Cafe | Bar | Food Truck | Beach | Attraction | Shop | Park | Service | Transportation | Other
  "status": "Open",                        // Open | Closed | Out to Lunch | Closed for the Season | Opening Late | Back Soon | Open 24 Hours
  "is_open": true,                         // convenience boolean derived from status
  "status_updated_at": "2026-07-03T14:05:00Z",  // ISO 8601 UTC
  "return_time": null,                     // "HH:MM" for "Out to Lunch"
  "hours": [ { "day": 0, "open": "08:00", "close": "14:00", "closed": false } ],  // day 0=Sun..6=Sat, times AST
  "lat": 18.12, "lon": -65.44,
  "island": "vieques",
  "description": "…", "description_es": null,
  "cover_photo": "https://abierto.app/uploads/xxxx.jpg"   // absolute URL or null
}
```

## Behavior

- **Stable ids** — a business `id` is never reused or renumbered.
- **Caching** — `Cache-Control: public, s-maxage=30, stale-while-revalidate=120`, plus an
  `ETag` for cheap conditional polling (status changes intraday).
- **CORS** — allows `https://viequesroomservice.com`, `https://www.viequesroomservice.com`,
  and `https://vrs-admin.quentin-forgues.workers.dev`. Server-to-server (no Origin) is allowed.
- **Backward compat** — the older `/api/businesses` still works; `/api/v1/…` is the contract going forward.

## Ownership contract (Abierto ⇄ VRS)

- **Abierto owns:** business identity, category, location, photos, hours, **live open/closed status.**
- **VRS owns:** menu, prices, order flow, delivery, tip, payment.
- **Link:** VRS stores `abiertoId` on each vendor; both expose read-only APIs; neither writes to the other.

## Consuming VRS from Abierto

Abierto shows an **"Order Delivery"** button on a business when a VRS vendor's `abiertoId`
matches that business `id`. Source: `GET https://vrs-admin.quentin-forgues.workers.dev/api/v1/vendors`
(`{ id, name, abiertoId, orderUrl, ... }`). See `frontend/src/api/vrs.js`.

> ⚠️ Setup dependency: the button only appears once VRS sets `abiertoId` on the vendor
> (currently null on the "La Palma Café & Bar" vendor).

## Deploy note (Cloudflare)

`abierto.app` sits behind Cloudflare, which 403s datacenter IPs (server-to-server calls from
Workers/Vercel get blocked while browsers succeed). A **WAF/Bot-Fight skip rule for path
`/api/v1/*`** is required so VRS's server can call the API. *(Configured in the Cloudflare
dashboard — not in this repo.)*
