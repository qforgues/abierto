import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';

const VIEQUES_CENTER = [18.12, -65.44];
const DEFAULT_ZOOM = 13;

const STATUS_COLORS = {
  Open: '#22c55e',
  Closed: '#ef4444',
  'Out to Lunch': '#f59e0b',
  'Closed for the Season': '#64748b',
};

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
          url="/tiles/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={18}
        />
        {located.map(b => (
          <CircleMarker
            key={b.id}
            center={[b.lat, b.lon]}
            radius={10}
            pathOptions={{
              fillColor: STATUS_COLORS[b.status] || '#94a3b8',
              fillOpacity: 0.9,
              color: 'white',
              weight: 2,
            }}
          >
            <Popup>
              <strong>{b.name}</strong><br />
              {b.status || 'No status'}<br />
              <Link to={`/business/${b.id}`}>View →</Link>
            </Popup>
          </CircleMarker>
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
