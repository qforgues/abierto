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

export function detectIsland(lat, lon) {
  for (const island of Object.values(ISLANDS)) {
    const { minLat, maxLat, minLon, maxLon } = island.bounds;
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
      return island.key;
    }
  }
  return null;
}
