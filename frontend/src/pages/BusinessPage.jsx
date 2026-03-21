import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import HoursDisplay from '../components/HoursDisplay';
import { api } from '../api/client';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts + 'Z')) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BusinessPage() {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/businesses/${id}`),
      api.get(`/businesses/${id}/hours`),
    ])
      .then(([b, h]) => { setBusiness(b); setHours(h); })
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.get(`/businesses/${id}`).then(setBusiness).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <><Navbar /><div className="spinner" /></>;
  if (!business) return <><Navbar /><div className="page text-center mt-6"><p>Business not found.</p><Link to="/">← Back</Link></div></>;

  return (
    <>
      <Navbar />
      <div className="page page-narrow">
        {business.photos?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(business.photos.length, 3)}, 1fr)`, gap: 8, marginBottom: 20 }}>
            {business.photos.map(p => (
              <img key={p.id} src={`/uploads/${p.filename}`} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }} />
            ))}
          </div>
        )}

        <div className="card card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem' }}>{business.name}</h1>
            <StatusBadge status={business.status} large />
          </div>

          {business.category && <p className="text-sm text-muted mt-2">{business.category}</p>}
          {business.description && <p style={{ marginTop: 12, lineHeight: 1.6 }}>{business.description}</p>}
          {business.note && (
            <div className="alert alert-info mt-4">{business.note}</div>
          )}
          {business.status_updated_at && (
            <p className="text-sm text-muted mt-4">Updated {timeAgo(business.status_updated_at)}</p>
          )}
          {business.lat && business.lon && (
            <p className="text-sm text-muted mt-2">📍 {Number(business.lat).toFixed(5)}, {Number(business.lon).toFixed(5)}</p>
          )}
        </div>

        {hours.length > 0 && (
          <div className="card card-body mt-4">
            <h2 style={{ marginBottom: 14 }}>Hours</h2>
            <HoursDisplay hours={hours} />
          </div>
        )}

        <div className="mt-4">
          <Link to="/" className="btn btn-ghost btn-sm">← All Businesses</Link>
        </div>
      </div>
    </>
  );
}
