import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { uploadUrl } from '../api/client';

const CATEGORY_ICONS = {
  Restaurant: '🍽️', 'Food Truck': '🚚', Bar: '🍹', Cafe: '☕',
  Shop: '🛍️', Service: '🔧', Beach: '🏖️', Other: '📍',
};

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BusinessCard({ business }) {
  const icon = CATEGORY_ICONS[business.category] || '📍';
  const { status, return_time, return_date, note } = business;

  return (
    <Link to={`/business/${business.id}`} className="card business-card" style={{ display: 'flex' }}>
      {business.cover_photo ? (
        <img src={uploadUrl(business.cover_photo)} alt={business.name} className="business-card-cover" />
      ) : (
        <div className="business-card-cover-placeholder">{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, lineHeight: 1.3 }}>{business.name}</h3>
          <StatusBadge status={status} />
        </div>
        {business.category && (
          <p className="text-sm text-muted mt-2">{icon} {business.category}</p>
        )}
        {business.description && (
          <p className="text-sm mt-2" style={{ color: 'var(--dark)', opacity: 0.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{business.description}</p>
        )}
        {status === 'Out to Lunch' && return_time && (
          <p className="text-sm mt-2" style={{ color: 'var(--status-out-to-lunch)', fontWeight: 500 }}>
            Back at {fmt12(return_time)}
          </p>
        )}
        {status === 'Closed for the Season' && return_date && (
          <p className="text-sm mt-2" style={{ color: 'var(--status-season)', fontWeight: 500 }}>
            Reopening {fmtDate(return_date)}
          </p>
        )}
        {note && status !== 'Out to Lunch' && status !== 'Closed for the Season' && (
          <p className="text-sm mt-2" style={{ color: 'var(--dark)', opacity: 0.75 }}>{note}</p>
        )}
      </div>
    </Link>
  );
}
