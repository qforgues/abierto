import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { ICON_PATHS } from './CategoryIcon';
import { ISLANDS } from '../constants/islands';

const STATUS_COLORS = {
  Open: '#16a34a',
  'Open 24 Hours': '#16a34a',
  Closed: '#ef4444',
  'Out to Lunch': '#f59e0b',
  'Closed for the Season': '#64748b',
};

// Abierto island map — warm "paper" land + brand-teal water + gold roads,
// echoing the vintage travel-poster island cards. (brand: teal #0d9488, gold #f5c518)
const MAP_STYLES = [
  { elementType: 'geometry',            stylers: [{ color: '#f6efda' }] },  // warm paper land
  { elementType: 'labels.text.fill',    stylers: [{ color: '#0f5b54' }] },  // deep teal labels
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#fbf6ea' }] },

  // Water — brand teal
  { featureType: 'water', elementType: 'geometry.fill',    stylers: [{ color: '#7fd7ca' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0f5b54' }] },

  // Landscape
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#f2ebd3' }] },

  // Parks / nature — soft green
  { featureType: 'poi.park', elementType: 'geometry',         stylers: [{ color: '#bfe0a4' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#2f7d4f' }] },
  { featureType: 'poi',      elementType: 'geometry',         stylers: [{ color: '#ece1c1' }] },

  // Buildings — footprints from overhead: sand fill + warm outline
  { featureType: 'landscape.man_made', elementType: 'geometry.fill',   stylers: [{ color: '#ecdfbe' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#c9b382' }] },

  // Roads — cream with sandy edges; highways in brand gold
  { featureType: 'road',         elementType: 'geometry.fill',    stylers: [{ color: '#fffdf6' }] },
  { featureType: 'road',         elementType: 'geometry.stroke',  stylers: [{ color: '#e3d3a4' }] },
  { featureType: 'road',         elementType: 'labels.text.fill', stylers: [{ color: '#7a5c1e' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill',    stylers: [{ color: '#f5c518' }] },  // brand gold
  { featureType: 'road.highway', elementType: 'geometry.stroke',  stylers: [{ color: '#d4a017' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#7a5c00' }] },

  // Admin borders — soft teal
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#7fbcae' }] },

  // Declutter
  { featureType: 'transit',      stylers: [{ visibility: 'off' }] },
  { featureType: 'poi',          elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

function markerIcon(business) {
  const color = STATUS_COLORS[business.status] || '#94a3b8';
  // Same custom line icons as the rest of the app (currentColor -> status color).
  const iconInner = (ICON_PATHS[business.category] || ICON_PATHS.Other).replace(/currentColor/g, color);
  const isOpen = business.status === 'Open' || business.status === 'Open 24 Hours';
  const glow = isOpen
    ? `<circle cx="22" cy="22" r="21" fill="${color}" opacity="0.18"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    ${glow}
    <circle cx="22" cy="22" r="18" fill="white" stroke="${color}" stroke-width="3"/>
    <g transform="translate(12.4,12.4) scale(0.8)" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${iconInner}</g>
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

export default function MapView({ businesses, userLocation, island = 'vieques', center, zoom, showLocate = true }) {
  const islandConfig = ISLANDS[island] || ISLANDS.vieques;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState('');
  const located = (businesses || []).filter(b => b.lat && b.lon);

  const onLoad = useCallback(map => { mapRef.current = map; }, []);

  // Pan to a real location — but only if it's actually on this island.
  // Prevents the map from silently parking on the island center (near Sun Bay).
  const goToLocation = (lat, lon) => {
    if (!mapRef.current) return;
    const b = islandConfig.bounds;
    if (b && (lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon)) {
      setLocateMsg(`You don't seem to be on ${islandConfig.name} right now.`);
      return;
    }
    setLocateMsg('');
    mapRef.current.panTo({ lat, lng: lon });
    mapRef.current.setZoom(16);
  };

  const handleLocate = () => {
    setLocateMsg('');
    if (userLocation) { goToLocation(userLocation.lat, userLocation.lon); return; }
    if (!navigator.geolocation) { setLocateMsg('Location isn’t available on this device.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); goToLocation(pos.coords.latitude, pos.coords.longitude); },
      () => { setLocating(false); setLocateMsg('Couldn’t find you. Check location permission and try again.'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
        center={center || islandConfig.center}
        zoom={zoom || islandConfig.zoom}
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

      {locateMsg && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: '#1a3c2a', color: '#fff', padding: '8px 14px',
          borderRadius: 10, fontSize: '0.82rem', fontWeight: 500, maxWidth: 260,
          textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        }}>
          {locateMsg}
        </div>
      )}

      {/* Only offer "Where Am I?" when we don't already know the location */}
      {showLocate && !userLocation && (
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
      )}
    </div>
  );
}
