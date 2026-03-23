import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { CATEGORY_ICONS } from '../constants/categories';

const VIEQUES_CENTER = [18.12, -65.44];
const DEFAULT_ZOOM = 13;

const STATUS_COLORS = {
  Open: '#16a34a',
  'Open 24 Hours': '#16a34a',
  Closed: '#ef4444',
  'Out to Lunch': '#f59e0b',
  'Closed for the Season': '#64748b',
};

function businessIcon(business) {
  const color = STATUS_COLORS[business.status] || '#94a3b8';
  const emoji = CATEGORY_ICONS[business.category] || '📍';
  const isOpen = business.status === 'Open' || business.status === 'Open 24 Hours';
  const glow = isOpen ? `0 0 0 4px ${color}28, 0 3px 10px rgba(0,0,0,0.22)` : '0 2px 8px rgba(0,0,0,0.2)';

  const html = `
    <div style="
      width:36px; height:36px;
      background:white;
      border:3px solid ${color};
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:17px; line-height:1;
      box-shadow:${glow};
    ">${emoji}</div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function FlyToUser({ userLocation }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) map.flyTo([userLocation.lat, userLocation.lon], 16, { duration: 1 });
  }, [userLocation?.lat, userLocation?.lon]);
  return null;
}

export default function MapView({ businesses, userLocation }) {
  const located = (businesses || []).filter(b => b.lat && b.lon);
  const [flyRequested, setFlyRequested] = React.useState(false);

  const handleLocate = () => {
    if (userLocation) setFlyRequested(f => !f);
    else navigator.geolocation?.getCurrentPosition(() => {});
  };

  return (
    <div className="map-container" style={{ position: 'relative' }}>
      <MapContainer
        center={VIEQUES_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        {located.map(b => (
          <Marker key={b.id} position={[b.lat, b.lon]} icon={businessIcon(b)}>
            <Popup>
              <div style={{ minWidth: 120 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{b.name}</strong>
                <span style={{ color: STATUS_COLORS[b.status] || '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
                  {b.status || 'No status'}
                </span>
                <br />
                <Link to={`/business/${b.id}`} style={{ fontSize: '0.85rem', color: '#0d9488' }}>View →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={9}
            pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 2.5 }}
          >
            <Popup>📍 You are here</Popup>
          </CircleMarker>
        )}
        {flyRequested && userLocation && <FlyToUser userLocation={userLocation} />}
      </MapContainer>
      <button
        onClick={handleLocate}
        title="Find my location"
        style={{
          position: 'absolute',
          bottom: 30,
          right: 10,
          zIndex: 1000,
          background: 'white',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 6,
          width: 36,
          height: 36,
          cursor: 'pointer',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
        }}
      >
        {userLocation ? '🎯' : '📍'}
      </button>
    </div>
  );
}
