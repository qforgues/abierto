import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import HoursDisplay from '../components/HoursDisplay';
import { api, uploadUrl } from '../api/client';
import { useLang } from '../context/LangContext';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts + 'Z')) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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

export default function BusinessPage() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const bp = t.businessPage;
  const [business, setBusiness] = useState(null);
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportIssue, setReportIssue] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportStatus, setReportStatus] = useState(null); // null | 'sending' | 'done'

  useEffect(() => {
    api.post('/analytics/hit', { path: `/business/${id}` }).catch(() => {});
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
  if (!business) return <><Navbar /><div className="page text-center mt-6"><p>{bp.notFound}</p><Link to="/">{bp.back}</Link></div></>;

  const { status, return_time, return_date, note } = business;
  const displayName = lang === 'es' ? (business.name_es || business.name) : business.name;
  const displayDesc = lang === 'es' ? (business.description_es || business.description) : business.description;
  const displayCategory = business.category ? (t.categories[business.category] || business.category) : null;

  return (
    <>
      <Navbar />
      <div className="page page-narrow">
        {business.lat && business.lon && (
          <div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', background: '#e2e8f0' }}>
            <img
              src={`https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${business.lat},${business.lon}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&return_error_codes=true`}
              alt={`Street view of ${displayName}`}
              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
              onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
            />
          </div>
        )}
        {business.photos?.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: business.photos.length >= 4 ? '1fr 1fr' : `repeat(${Math.min(business.photos.length, 3)}, 1fr)`,
            gap: 8,
            marginBottom: 20,
          }}>
            {business.photos.map(p => (
              <img
                key={p.id}
                src={uploadUrl(p.filename)}
                alt=""
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }}
                onError={e => { e.currentTarget.parentElement.removeChild(e.currentTarget); }}
              />
            ))}
          </div>
        )}

        <div className="card card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem' }}>{displayName}</h1>
            <StatusBadge status={status} large />
          </div>

          {displayCategory && <p className="text-sm text-muted mt-2">{displayCategory}</p>}
          {displayDesc && <p style={{ marginTop: 12, lineHeight: 1.6 }}>{displayDesc}</p>}

          {status === 'Out to Lunch' && return_time && (
            <div className="alert alert-info mt-4" style={{ color: 'var(--status-out-to-lunch)', fontWeight: 500 }}>
              {bp.backAt} {fmt12(return_time)}
            </div>
          )}
          {status === 'Closed for the Season' && return_date && (
            <div className="alert alert-info mt-4" style={{ color: 'var(--status-season)', fontWeight: 500 }}>
              {bp.reopening} {fmtDate(return_date)}
            </div>
          )}
          {note && status !== 'Out to Lunch' && status !== 'Closed for the Season' && (
            <div className="alert alert-info mt-4">{note}</div>
          )}

          {business.status_updated_at && (
            <p className="text-sm text-muted mt-4">{bp.updated} {timeAgo(business.status_updated_at)}</p>
          )}
          {business.phone && (
            <p className="text-sm mt-2">
              📱 <a href={`tel:${business.phone}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>{business.phone}</a>
            </p>
          )}
          {business.lat && business.lon && (
            <p className="text-sm text-muted mt-2">📍 {Number(business.lat).toFixed(5)}, {Number(business.lon).toFixed(5)}</p>
          )}
        </div>

        {hours.length > 0 && (
          <div className="card card-body mt-4">
            <h2 style={{ marginBottom: 14 }}>{bp.hoursTitle}</h2>
            <HoursDisplay hours={hours} />
          </div>
        )}

        <div className="mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Link to="/" className="btn btn-ghost btn-sm">{bp.backAll}</Link>
          <button
            onClick={() => { setReportOpen(true); setReportIssue(''); setReportNote(''); setReportStatus(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--mid)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}
          >
            ⚑ {bp.reportBtn}
          </button>
        </div>
      </div>

      {reportOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card card-body" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>{bp.reportTitle}</h2>
            <p className="text-sm text-muted" style={{ margin: 0 }}>{bp.reportSubtitle}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[bp.reportIssue1, bp.reportIssue2, bp.reportIssue3, bp.reportIssue4].map(issue => (
                <label key={issue} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${reportIssue === issue ? 'var(--ocean)' : 'var(--border)'}`, background: reportIssue === issue ? '#f0fbff' : 'white' }}>
                  <input type="radio" name="issue" value={issue} checked={reportIssue === issue} onChange={() => setReportIssue(issue)} style={{ accentColor: 'var(--ocean)' }} />
                  <span style={{ fontSize: '0.9rem' }}>{issue}</span>
                </label>
              ))}
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem' }}>{bp.reportNote}</label>
              <textarea rows={2} value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder={bp.reportNotePlaceholder} style={{ resize: 'none' }} />
            </div>
            {reportStatus === 'done' && <p style={{ color: 'var(--teal)', margin: 0, fontWeight: 600 }}>✓ {bp.reportDone}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setReportOpen(false)}>{bp.reportCancel}</button>
              <button
                className="btn btn-primary"
                disabled={!reportIssue || reportStatus === 'sending' || reportStatus === 'done'}
                onClick={async () => {
                  setReportStatus('sending');
                  try {
                    await api.post('/notifications/report', {
                      business_id: business.id,
                      business_name: business.name,
                      issue: reportIssue,
                      note: reportNote,
                    });
                    setReportStatus('done');
                    setTimeout(() => setReportOpen(false), 2000);
                  } catch {
                    setReportStatus(null);
                  }
                }}
              >
                {reportStatus === 'sending' ? bp.reportSending : bp.reportSend}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
