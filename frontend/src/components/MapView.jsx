import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { CATEGORY_ICONS } from '../constants/categories';
import { ISLANDS } from '../constants/islands';

const STATUS_COLORS = {
  Open: '#16a34a',
  'Open 24 Hours': '#16a34a',
  Closed: '#ef4444',
  'Out to Lunch': '#f59e0b',
  'Closed for the Season': '#64748b',
};

// Tropical Caribbean palette matching Abierto brand
const MAP_STYLES = [
  { elementType: 'geometry',              stylers: [{ color: '#dff0d0' }] },
  { elementType: 'labels.text.fill',      stylers: [{ color: '#1a3c2a' }] },
  { elementType: 'labels.text.stroke',    stylers: [{ color: '#ffffff' }] },

  // Water — brand turquoise
  { featureType: 'water', elementType: 'geometry.fill',   stylers: [{ color: '#2dd4bf' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0d9488' }] },

  // Roads
  { featureType: 'road',                  elementType: 'geometry',        stylers: [{ color: '#ffffff' }] },
  { featureType: 'road',                  elementType: 'geometry.stroke', stylers: [{ color: '#d4c9a8' }] },
  { featureType: 'road',                  elementType: 'labels.text.fill', stylers: [{ color: '#5a4a32' }] },
  { featureType: 'road.highway',          elementType: 'geometry',        stylers: [{ color: '#f5c518' }] },
  { featureType: 'road.highway',          elementType: 'geometry.stroke', stylers: [{ color: '#d4a017' }] },
  { featureType: 'road.highway',          elementType: 'labels.text.fill', stylers: [{ color: '#7a5c00' }] },

  // Landscape
  { featureType: 'landscape.natural',     elementType: 'geometry', stylers: [{ color: '#c4e8a8' }] },
  { featureType: 'poi.park',              elementType: 'geometry', stylers: [{ color: '#9ed68f' }] },
  { featureType: 'poi.park',              elementType: 'labels.text.fill', stylers: [{ color: '#2d6a4f' }] },
  { featureType: 'poi',                   elementType: 'geometry', stylers: [{ color: '#d0e8c0' }] },
  { featureType: 'poi',                   elementType: 'labels.text.fill', stylers: [{ color: '#3a7d44' }] },

  // Admin borders
  { featureType: 'administrative',        elementType: 'geometry.stroke', stylers: [{ color: '#8fbc8f' }] },

  // Hide transit clutter
  { featureType: 'transit',              stylers: [{ visibility: 'off' }] },

  // Hide Google's own POI labels (hotels, restaurants, etc.)
  { featureType: 'poi',                  elementType: 'labels',           stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business',         stylers: [{ visibility: 'off' }] },
];

function markerIcon(business) {
  const color = STATUS_COLORS[business.status] || '#94a3b8';
  const emoji = CATEGORY_ICONS[business.category] || '📍';
  const isOpen = business.status === 'Open' || business.status === 'Open 24 Hours';
  const glow = isOpen
    ? `<circle cx="22" cy="22" r="21" fill="${color}" opacity="0.18"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    ${glow}
    <circle cx="22" cy="22" r="18" fill="white" stroke="${color}" stroke-width="3"/>
    <text x="22" y="29" text-anchor="middle" font-size="18" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(44, 44),
    anchor: new window.google.maps.Point(22, 22),
  };
}

function userMarkerIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="9" fill="#3b82f6" stroke="white" stroke-width="2.5"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(22, 22),
    anchor: new window.google.maps.Point(11, 11),
  };
}

export default function MapView({ businesses, userLocation, island = 'vieques' }) {
  const islandConfig = ISLANDS[island] || ISLANDS.vieques;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [locating, setLocating] = useState(false);
  const located = (businesses || []).filter(b => b.lat && b.lon);

  const onLoad = useCallback(map => { mapRef.current = map; }, []);

  const handleLocate = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lon });
      mapRef.current.setZoom(16);
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          mapRef.current.setZoom(16);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  if (!isLoaded) {
    return (
      <div className="map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="map-container" style={{ position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={{ height: '100%', width: '100%' }}
        center={islandConfig.center}
        zoom={islandConfig.zoom}
        onLoad={onLoad}
        onClick={() => setSelected(null)}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          scrollwheel: false,
          gestureHandling: 'cooperative',
        }}
      >
        {located.map(b => (
          <Marker
            key={b.id}
            position={{ lat: b.lat, lng: b.lon }}
            icon={markerIcon(b)}
            onClick={() => setSelected(b)}
          />
        ))}

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lon }}
            onCloseClick={() => setSelected(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -22) }}
          >
            <div style={{ minWidth: 120 }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>{selected.name}</strong>
              <span style={{ color: STATUS_COLORS[selected.status] || '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
                {selected.status || 'No status'}
              </span>
              <br />
              <Link to={`/business/${selected.id}`} style={{ fontSize: '0.85rem', color: '#0d9488' }}>View →</Link>
            </div>
          </InfoWindow>
        )}

        {userLocation && (
          <Marker
            position={{ lat: userLocation.lat, lng: userLocation.lon }}
            icon={userMarkerIcon()}
            title="You are here"
          />
        )}
      </GoogleMap>

      <button
        onClick={handleLocate}
        title="Find my location"
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'white',
          border: '2px solid rgba(0,0,0,0.15)',
          borderRadius: 24,
          padding: '8px 18px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          whiteSpace: 'nowrap',
          color: '#1a3c2a',
          opacity: locating ? 0.7 : 1,
        }}
      >
        <span>{locating ? '⏳' : '📍'}</span>
        {locating ? 'Locating…' : 'Where Am I?'}
      </button>
    </div>
  );
}
