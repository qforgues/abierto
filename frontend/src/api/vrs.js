// Vieques Room Service integration (read-only, optional).
// Fetches VRS vendors once, maps each vendor's abiertoId -> orderUrl, so an
// "Order Delivery" link can appear on the matching Abierto business. Fails silent.
import { useState, useEffect } from 'react';

const VRS_VENDORS_URL = 'https://vrs-admin.quentin-forgues.workers.dev/api/v1/vendors';

let mapPromise; // module-level cache so we only fetch VRS once per session
export function getVrsOrderMap() {
  if (!mapPromise) {
    mapPromise = fetch(VRS_VENDORS_URL)
      .then(r => (r.ok ? r.json() : []))
      .then(vendors => {
        const map = {};
        (vendors || []).forEach(v => {
          if (v && v.abiertoId != null && v.orderUrl) map[String(v.abiertoId)] = v.orderUrl;
        });
        return map;
      })
      .catch(() => ({}));
  }
  return mapPromise;
}

// Returns the VRS orderUrl for a business id, or null if it isn't deliverable.
export function useVrsOrderUrl(businessId) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    getVrsOrderMap().then(map => { if (alive) setUrl(map[String(businessId)] || null); });
    return () => { alive = false; };
  }, [businessId]);
  return url;
}
