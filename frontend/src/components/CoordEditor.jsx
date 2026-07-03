import React, { useState, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

// Default view: Isabel Segunda, Vieques (used when a business has no coords yet).
const DEFAULT_CENTER = { lat: 18.1503, lng: -65.4423 };

function parseCoords(text) {
  const m = text.trim().match(/^(-?\d{1,3}\.?\d*)[,\s]+(-?\d{1,3}\.?\d*)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

// lat/lon are full floats (e.g. 18.123456, -65.543210) or null.
// onChange(lat, lon) is called whenever the pin moves (drag, tap, paste, My Location).
export default function CoordEditor({ lat, lon, onChange }) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY });
  const [pos, setPos] = useState(lat && lon ? { lat: Number(lat), lng: Number(lon) } : null);
  const [raw, setRaw] = useState(lat && lon ? `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}` : '');
  const mapRef = useRef(null);

  const setCoords = useCallback((la, ln, { recenter = false } = {}) => {
    const rlat = parseFloat(Number(la).toFixed(6));
    const rlon = parseFloat(Number(ln).toFixed(6));
    setPos({ lat: rlat, lng: rlon });
    setRaw(`${rlat}, ${rlon}`);
    onChange(rlat, rlon);
    if (recenter && mapRef.current) mapRef.current.panTo({ lat: rlat, lng: rlon });
  }, [onChange]);

  const onMapLoad = useCallback(m => { mapRef.current = m; }, []);

  const handleText = (text) => {
    setRaw(text);
    const c = parseCoords(text);
    if (c) setCoords(c.lat, c.lon, { recenter: true });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not available.');
    navigator.geolocation.getCurrentPosition(
      p => setCoords(p.coords.latitude, p.coords.longitude, { recenter: true }),
      () => alert('Location access denied.'),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 300, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={pos || DEFAULT_CENTER}
            zoom={pos ? 18 : 14}
            onLoad={onMapLoad}
            onClick={e => setCoords(e.latLng.lat(), e.latLng.lng())}
            options={{
              streetViewControl: false,
              fullscreenControl: false,
              mapTypeControl: true,       // let admins flip to satellite for precise placement
              gestureHandling: 'greedy',
            }}
          >
            {pos && (
              <Marker
                position={pos}
                draggable
                onDragEnd={e => setCoords(e.latLng.lat(), e.latLng.lng())}
                title="Drag me to the exact spot"
              />
            )}
          </GoogleMap>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--light)' }}>
            <div className="spinner" />
          </div>
        )}
      </div>

      <p className="text-sm text-muted" style={{ margin: 0 }}>
        {pos
          ? '📍 Drag the pin to the exact spot, or tap anywhere on the map to move it. Then Save.'
          : '📍 Tap the map to drop a pin on this business, or use the buttons below.'}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={raw}
          onChange={e => handleText(e.target.value)}
          placeholder="18.123456, -65.543210  (or paste from Google Maps)"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation} style={{ whiteSpace: 'nowrap' }}>
          📍 My Location
        </button>
      </div>
    </div>
  );
}
