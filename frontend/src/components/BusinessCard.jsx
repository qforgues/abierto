import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const CATEGORY_ICONS = {
  Restaurant: '🍽️', 'Food Truck': '🚚', Bar: '🍹', Cafe: '☕',
  Shop: '🛍️', Service: '🔧', Beach: '🏖️', Other: '📍',
};

export default function BusinessCard({ business }) {
  const icon = CATEGORY_ICONS[business.category] || '📍';
  return (
    <Link to={`/business/${business.id}`} className="card business-card" style={{ display: 'flex' }}>
      {business.cover_photo ? (
        <img src={`/uploads/${business.cover_photo}`} alt={business.name} className="business-card-cover" />
      ) : (
        <div className="business-card-cover-placeholder">{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, lineHeight: 1.3 }}>{business.name}</h3>
          <StatusBadge status={business.status} />
        </div>
        {business.category && (
          <p className="text-sm text-muted mt-2">{icon} {business.category}</p>
        )}
        {business.note && (
          <p className="text-sm mt-2" style={{ color: 'var(--dark)', opacity: 0.75 }}>{business.note}</p>
        )}
      </div>
    </Link>
  );
}
