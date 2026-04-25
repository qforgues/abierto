import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatRecurrence(r) {
  if (!r) return null;
  if (r.freq === 'daily') return 'Every day';
  if (r.freq === 'weekly' && r.days?.length) return 'Every ' + r.days.map(d => DAYS[d]).join(', ');
  if (r.freq === 'monthly' && r.day) return `Every ${r.day}${['th','st','nd','rd'][Math.min(r.day%10,3)] || 'th'} of the month`;
  return 'Recurring';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, min] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(min).padStart(2,'0')} ${ampm}`;
}

export default function EventsPage({ island = 'vieques' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const islandLabel = island === 'vieques' ? 'Vieques' : 'Culebra';

  useEffect(() => {
    api.get(`/events?island=${island}`)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [island]);

  return (
    <>
      <Navbar />
      <div className="page" style={{ paddingTop: 28, paddingBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/' + island)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ocean)', fontSize: '0.9rem', padding: 0 }}>
            ← {islandLabel}
          </button>
        </div>
        <h1 style={{ marginBottom: 4 }}>Events</h1>
        <p className="text-muted" style={{ marginBottom: 28, fontSize: '0.95rem' }}>Upcoming events in {islandLabel}</p>

        {loading && <div className="spinner" />}

        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗓️</div>
            <p style={{ fontWeight: 600 }}>No upcoming events</p>
            <p style={{ fontSize: '0.88rem', marginTop: 4 }}>Check back soon!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map(event => {
            const rec = formatRecurrence(event.recurrence);
            return (
              <div key={event.id} className="card card-body" style={{ gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{event.title}</h3>
                  {rec && (
                    <span style={{ background: 'var(--light)', color: 'var(--ocean)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', border: '1px solid var(--border)' }}>
                      🔁 {rec}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: '0.88rem', color: 'var(--mid)' }}>
                  <span>📅 {rec ? rec : formatDate(event.start_date)}</span>
                  {event.start_time && (
                    <span>🕐 {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
                  )}
                  {event.location_name && <span>📍 {event.location_name}</span>}
                </div>
                {event.description && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--dark)', lineHeight: 1.5 }}>{event.description}</p>
                )}
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--mid)' }}>Organized by {event.coordinator_name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
