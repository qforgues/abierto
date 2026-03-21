import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';

const VIEQUES_CENTER = [18.12, -65.44];
const DEFAULT_ZOOM = 13;

const STATUS_COLORS = {
  Open: '#22c55e',
  Closed: '#ef4444',
  'Opening Late': '#f59e0b',
  'Back Soon': '#f59e0b',
  'Sold Out': '#8b5cf6',
};

export default function MapView({ businesses }) {
  const located = (businesses || []).filter(b => b.lat && b.lon);

  return (
    <div className="map-container">
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
      </MapContainer>
    </div>
  );
}
