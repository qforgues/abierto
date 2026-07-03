import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { uploadUrl } from '../api/client';
import CategoryIcon from './CategoryIcon';
import { useVrsOrderUrl } from '../api/vrs';
import { useAutoTranslated } from '../api/translate';
import { useLang } from '../context/LangContext';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`;
}


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

export default function BusinessCard({ business, userLocation }) {
  const { lang, t } = useLang();
  const orderUrl = useVrsOrderUrl(business.id);
  const { status, return_time, return_date, note } = business;
  const displayName = lang === 'es' ? (business.name_es || business.name) : business.name;
  const displayDesc = useAutoTranslated(business.description, business.description_es, lang, business.id);
  const displayCategory = business.category ? (t.categories[business.category] || business.category) : null;

  const hasGeo = business.lat && business.lon && userLocation;
  const distance = hasGeo ? getDistance(userLocation.lat, userLocation.lon, business.lat, business.lon) : null;
  const bearing = hasGeo ? getBearing(userLocation.lat, userLocation.lon, business.lat, business.lon) : null;

  return (
    <Link to={`/business/${business.id}`} className="card business-card" style={{ display: 'flex' }}>
      {business.cover_photo ? (
        <img src={uploadUrl(business.cover_photo)} alt={displayName} className="business-card-cover" />
      ) : (
        <div className="business-card-cover-placeholder"><CategoryIcon name={business.category} size={38} /></div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ margin: 0, lineHeight: 1.3 }}>{displayName}</h3>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {displayCategory && (
            <span className="text-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CategoryIcon name={business.category} size={15} /> {displayCategory}
            </span>
          )}
          {hasGeo && (
            <span className="text-sm" style={{ color: 'var(--ocean)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', transform: `rotate(${bearing}deg)`, lineHeight: 1 }}>▲</span>
              {fmtDist(distance)}
            </span>
          )}
        </div>
        {orderUrl && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(orderUrl, '_blank', 'noopener'); }}
            style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--ocean)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <CategoryIcon name="Delivery" size={16} /> {lang === 'es' ? 'Pedir Entrega' : 'Order Delivery'}
          </button>
        )}
        {displayDesc && (
          <p className="text-sm mt-2" style={{ color: 'var(--dark)', opacity: 0.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{displayDesc}</p>
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
