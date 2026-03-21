import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api/client';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts + (ts.includes('Z') ? '' : 'Z'))) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('businesses');
  const [businesses, setBusinesses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadBusinesses = useCallback(() =>
    api.get('/businesses/admin/all').then(setBusinesses), []);

  const loadNotifications = useCallback(() =>
    api.get('/notifications').then(setNotifications), []);

  useEffect(() => {
    Promise.all([loadBusinesses(), loadNotifications()]).finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    if (!confirm('Remove this business?')) return;
    await api.delete(`/businesses/${id}`);
    loadBusinesses();
  };

  const restore = async (id) => {
    await api.patch(`/businesses/${id}/restore`);
    loadBusinesses();
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    loadNotifications();
  };

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="page" style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1>Admin Dashboard</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {['businesses', 'notifications'].map(t => (
              <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
                {t === 'notifications' ? `🔔 Notifications${notifications.filter(n => !n.is_read).length > 0 ? ` (${notifications.filter(n => !n.is_read).length})` : ''}` : '🏪 Businesses'}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            {tab === 'businesses' && (
              <>
                <input
                  type="text"
                  placeholder="Search by name or code…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.length === 0 && <p className="text-muted text-center mt-4">No businesses yet.</p>}
                  {filtered.map(b => (
                    <div key={b.id} className="card card-body" style={{ opacity: b.is_active ? 1 : 0.55 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong>{b.name}</strong>
                            <StatusBadge status={b.status} />
                            {!b.is_active && <span style={{ fontSize: '0.75rem', background: '#e5e7eb', color: '#6b7280', padding: '2px 8px', borderRadius: 999 }}>Removed</span>}
                          </div>
                          <p className="text-sm text-muted mt-2">
                            Code: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.1em', color: 'var(--ocean)' }}>{b.code}</strong>
                            {b.category && ` · ${b.category}`}
                            {b.created_at && ` · Registered ${timeAgo(b.created_at)}`}
                          </p>
                          {b.description && <p className="text-sm mt-2" style={{ opacity: 0.7 }}>{b.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <a href={`/business/${b.id}`} target="_blank" className="btn btn-ghost btn-sm">View</a>
                          {b.is_active
                            ? <button className="btn btn-danger btn-sm" onClick={() => remove(b.id)}>Remove</button>
                            : <button className="btn btn-ghost btn-sm" onClick={() => restore(b.id)}>Restore</button>
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'notifications' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
                </div>
                {notifications.length === 0 && <p className="text-muted text-center mt-4">No notifications yet.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifications.map(n => (
                    <div key={n.id} className="card card-body" style={{
                      borderLeft: `4px solid ${n.is_read ? 'var(--border)' : 'var(--turquoise)'}`,
                      background: n.is_read ? 'var(--white)' : '#f0fbff',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.message}</p>
                        <span className="text-sm text-muted" style={{ flexShrink: 0, marginLeft: 12 }}>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
