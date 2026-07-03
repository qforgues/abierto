// Pulls a representative Google photo for an Attraction (Monte Pirata, Mosquito Bay,
// Great Ceiba Tree…) via the Places API (New) Text Search + Place Photo. Read-only,
// cached per business, fails silent ("when and where possible").
import { useState, useEffect } from 'react';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ISLAND_NAMES = { vieques: 'Vieques', culebra: 'Culebra' };
const cache = {}; // businessId -> { url, attribution } | null

export async function getAttractionPhoto(business) {
  if (!business || business.category !== 'Attraction' || !business.name || !KEY) return null;
  const id = business.id;
  if (id in cache) return cache[id];

  const island = ISLAND_NAMES[business.island] || 'Vieques';
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'places.photos,places.displayName',
      },
      body: JSON.stringify({ textQuery: `${business.name}, ${island}, Puerto Rico`, maxResultCount: 1 }),
    });
    if (!res.ok) { cache[id] = null; return null; }
    const data = await res.json();
    const photo = data.places?.[0]?.photos?.[0];
    if (!photo?.name) { cache[id] = null; return null; }
    const url = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1000&maxWidthPx=1400&key=${KEY}`;
    const attribution = photo.authorAttributions?.[0]?.displayName || 'Google';
    const result = { url, attribution };
    cache[id] = result;
    return result;
  } catch {
    cache[id] = null;
    return null;
  }
}

export function useAttractionPhoto(business) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let alive = true;
    getAttractionPhoto(business).then(p => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [business?.id, business?.category]);
  return photo;
}
