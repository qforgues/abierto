export const ISLANDS = {
  vieques: {
    key: 'vieques',
    name: 'Vieques',
    center: { lat: 18.1248, lng: -65.4420 },
    zoom: 12,
    bounds: { minLat: 18.04, maxLat: 18.20, minLon: -65.65, maxLon: -65.27 },
  },
  culebra: {
    key: 'culebra',
    name: 'Culebra',
    center: { lat: 18.3073, lng: -65.3029 },
    zoom: 13,
    bounds: { minLat: 18.27, maxLat: 18.37, minLon: -65.38, maxLon: -65.21 },
  },
};

// Flags a business whose coordinates look wrong/unset so an admin can verify them:
// missing, non-numeric, on/outside the island bounding box (likely in the water),
// or a round-number placeholder (e.g. 18.18000, -65.65000).
export function coordsSuspect(business) {
  const { lat, lon, island } = business || {};
  if (lat == null || lon == null || lat === '' || lon === '') return true;
  const nlat = Number(lat), nlon = Number(lon);
  if (!Number.isFinite(nlat) || !Number.isFinite(nlon)) return true;
  const isl = ISLANDS[island] || ISLANDS.vieques;
  const b = isl.bounds;
  if (nlat <= b.minLat || nlat >= b.maxLat || nlon <= b.minLon || nlon >= b.maxLon) return true;
  const lowPrec = n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6; // ≤2 decimals
  if (lowPrec(nlat) && lowPrec(nlon)) return true;
  return false;
}

export function detectIsland(lat, lon) {
  for (const island of Object.values(ISLANDS)) {
    const { minLat, maxLat, minLon, maxLon } = island.bounds;
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
      return island.key;
    }
  }
  return null;
}
