import React, { useState, useEffect, useRef } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function buildSvUrl(lat, lon) {
  if (!lat || !lon || !API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=480x260&location=${lat},${lon}&key=${API_KEY}&return_error_codes=true`;
}

function parseCoords(text) {
  const m = text.trim().match(/^(-?\d{1,3}\.?\d*)[,\s]+(-?\d{1,3}\.?\d*)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

// lat/lon are full floats (e.g. 18.123456, -65.543210) or null
// onChange(lat, lon) called whenever valid coords are parsed
export default function CoordEditor({ lat, lon, onChange }) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState(null);
  const [svError, setSvError] = useState(false);
  const debounce = useRef(null);

  // Initialise from props once on mount
  useEffect(() => {
    if (lat && lon) {
      setRaw(`${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`);
      setPreview({ lat, lon });
    }
  }, []);

  const applyCoords = (coords) => {
    onChange(coords.lat, coords.lon);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setSvError(false);
      setPreview(coords);
    }, 700);
  };

  const handleChange = (text) => {
    setRaw(text);
    const coords = parseCoords(text);
    if (coords) applyCoords(coords);
  };

  const useLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not available.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lon: parseFloat(pos.coords.longitude.toFixed(6)),
        };
        setRaw(`${coords.lat}, ${coords.lon}`);
        setSvError(false);
        setPreview(coords);
        onChange(coords.lat, coords.lon);
      },
      () => alert('Location access denied.')
    );
  };

  const svUrl = preview ? buildSvUrl(preview.lat, preview.lon) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={raw}
          onChange={e => handleChange(e.target.value)}
          placeholder="18.123456, -65.543210  (paste from Google Maps)"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={useLocation}
          style={{ whiteSpace: 'nowrap' }}>
          📍 My Location
        </button>
      </div>

      {svUrl && (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
          {svError ? (
            <div style={{ background: 'var(--light)', padding: '20px 16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--mid)' }}>
              No Street View imagery at these coordinates.<br />
              Try moving the pin slightly closer to the road.
            </div>
          ) : (
            <img
              src={svUrl}
              alt="Street View preview"
              style={{ width: '100%', display: 'block' }}
              onError={() => setSvError(true)}
            />
          )}
          <div style={{ padding: '6px 12px', background: 'var(--light)', fontSize: '0.75rem', color: 'var(--mid)', borderTop: '1px solid var(--border)' }}>
            Street View preview · {Number(preview.lat).toFixed(6)}, {Number(preview.lon).toFixed(6)}
          </div>
        </div>
      )}

      <p className="text-sm text-muted" style={{ margin: 0 }}>
        Right-click any location in <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> → "Copy coordinates", then paste here.
      </p>
    </div>
  );
}
