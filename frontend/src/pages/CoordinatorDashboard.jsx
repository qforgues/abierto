import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CoordEditor from '../components/CoordEditor';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DAYS = [
  { label: 'Sun', value: 0 }, { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

function blankForm(island) {
  return {
    title: '', description: '', location_name: '', lat: null, lon: null,
    island: island || 'vieques',
    start_date: '', start_time: '', end_time: '',
    is_recurring: false,
    recurrence: { freq: 'weekly', days: [] },
    recurrence_end: '',
  };
}

function formatDateShort(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} ${day}`;
}

export default function CoordinatorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | event object
  const [form, setForm] = useState(blankForm(user?.island));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/events/mine').then(setEvents).catch(() => {});

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const startCreate = () => {
    setForm(blankForm(user?.island));
    setEditing('new');
    setError('');
  };

  const startEdit = (event) => {
    setForm({
      title: event.title,
      description: event.description || '',
      location_name: event.location_name || '',
      lat: event.lat,
      lon: event.lon,
      island: event.island,
      start_date: event.start_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      is_recurring: !!event.is_recurring,
      recurrence: event.recurrence || { freq: 'weekly', days: [] },
      recurrence_end: event.recurrence_end || '',
    });
    setEditing(event);
    setError('');
  };

  const handleSave = async () => {
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.start_date && !form.is_recurring) return setError('Start date is required.');
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location_name: form.location_name.trim() || null,
        lat: form.lat || null,
        lon: form.lon || null,
        island: form.island,
        start_date: form.start_date || new Date().toISOString().split('T')[0],
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        is_recurring: form.is_recurring,
        recurrence: form.is_recurring ? form.recurrence : null,
        recurrence_end: form.is_recurring ? (form.recurrence_end || null) : null,
      };
      if (editing === 'new') {
        await api.post('/events', payload);
      } else {
        await api.patch(`/events/${editing.id}`, payload);
      }
      await load();
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/events/${id}`);
    load();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const RecurrenceEditor = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--light)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
      <div className="field" style={{ margin: 0 }}>
        <label>Frequency</label>
        <select value={form.recurrence.freq} onChange={e => set('recurrence', { ...form.recurrence, freq: e.target.value, days: [], day: 1 })}>
          <option value="daily">Every day</option>
          <option value="weekly">Weekly (pick days)</option>
          <option value="monthly">Monthly (pick day)</option>
        </select>
      </div>
      {form.recurrence.freq === 'weekly' && (
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Days of week</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DAYS.map(d => {
              const active = (form.recurrence.days || []).includes(d.value);
              return (
                <button key={d.value} type="button"
                  onClick={() => {
                    const days = active
                      ? form.recurrence.days.filter(x => x !== d.value)
                      : [...(form.recurrence.days || []), d.value].sort((a,b) => a-b);
                    set('recurrence', { ...form.recurrence, days });
                  }}
                  style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${active ? 'var(--ocean)' : 'var(--border)'}`, background: active ? 'var(--ocean)' : 'white', color: active ? 'white' : 'var(--dark)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {form.recurrence.freq === 'monthly' && (
        <div className="field" style={{ margin: 0 }}>
          <label>Day of month</label>
          <input type="number" min="1" max="31" value={form.recurrence.day || 1}
            onChange={e => set('recurrence', { ...form.recurrence, day: parseInt(e.target.value) || 1 })} />
        </div>
      )}
      <div className="field" style={{ margin: 0 }}>
        <label>End date <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input type="date" value={form.recurrence_end} onChange={e => set('recurrence_end', e.target.value)} />
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="page page-narrow" style={{ paddingTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0 }}>My Events</h1>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
              {user?.name} · {user?.island === 'culebra' ? 'Culebra' : 'Vieques'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={startCreate}>+ New Event</button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        {/* Event form */}
        {editing !== null && (
          <div className="card card-body" style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>{editing === 'new' ? 'Create Event' : 'Edit Event'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="field">
              <label>Location name</label>
              <input type="text" value={form.location_name} onChange={e => set('location_name', e.target.value)} placeholder="e.g. Sombé Beach" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>Location pin <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
              <CoordEditor lat={form.lat} lon={form.lon} onChange={(lat, lon) => setForm(f => ({ ...f, lat, lon }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} />
              <label htmlFor="recurring" style={{ fontWeight: 600, cursor: 'pointer' }}>Recurring event</label>
            </div>
            {form.is_recurring ? (
              <RecurrenceEditor />
            ) : (
              <div className="field">
                <label>Date *</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Start time <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>End time <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Event'}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Events list */}
        {events.length === 0 && editing === null && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗓️</div>
            <p style={{ fontWeight: 600 }}>No events yet</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={startCreate}>Create your first event</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(event => (
            <div key={event.id} className="card card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{event.title}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--mid)', margin: 0 }}>
                  {event.is_recurring
                    ? `🔁 Recurring${event.recurrence ? ` · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_,i) => event.recurrence?.days?.includes(i)).join(', ') || event.recurrence.freq}` : ''}`
                    : `📅 ${formatDateShort(event.start_date)}`}
                  {event.start_time && ` · ${event.start_time}`}
                  {event.location_name && ` · ${event.location_name}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(event)}>Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(event.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
