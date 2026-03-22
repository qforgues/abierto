import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api/client';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatPaidAt(paid_at) {
  if (!paid_at) return '';
  const d = new Date(paid_at.replace(' ', 'T') + (paid_at.includes('Z') ? '' : 'Z'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BillingTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [editing, setEditing] = useState({});
  const [paying, setPaying] = useState({});

  const load = useCallback(() => {
    setError(null);
    return api.get('/subscriptions').then(setData).catch(err => setError(err.message));
  }, []);

  useEffect(() => { load(); }, []);

  const toggleHistory = async (businessId) => {
    if (expanded === businessId) { setExpanded(null); return; }
    setExpanded(businessId);
    if (!history[businessId]) {
      const h = await api.get(`/subscriptions/${businessId}/history`);
      setHistory(prev => ({ ...prev, [businessId]: h }));
    }
  };

  const saveAmount = async (businessId) => {
    const val = editing[businessId];
    if (val == null) return;
    await api.patch(`/subscriptions/${businessId}/amount`, { monthly_amount: parseFloat(val) });
    setEditing(prev => { const n = { ...prev }; delete n[businessId]; return n; });
    load();
  };

  const recordPayment = async (businessId) => {
    const p = paying[businessId];
    if (!p || p.amount == null) return;
    await api.post(`/subscriptions/${businessId}/payment`, {
      year: data.year,
      month: data.month,
      amount_paid: parseFloat(p.amount),
      note: p.note || '',
    });
    setPaying(prev => { const n = { ...prev }; delete n[businessId]; return n; });
    setHistory(prev => { const n = { ...prev }; delete n[businessId]; return n; }); // invalidate cache
    load();
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="spinner" />;

  const { year, month, businesses } = data;
  const totalDue = businesses.reduce((s, b) => s + b.monthly_amount, 0);
  const totalPaid = businesses.reduce((s, b) => s + (b.amount_paid || 0), 0);
  const totalOutstanding = businesses.reduce((s, b) => s + b.months_unpaid * b.monthly_amount, 0);

  // Past-due accounts first, then alphabetical
  const sorted = [...businesses].sort((a, b) => (b.months_unpaid - a.months_unpaid) || a.name.localeCompare(b.name));

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: `Billed — ${MONTH_NAMES[month - 1]} ${year}`, value: `$${totalDue.toFixed(2)}`, color: 'var(--ocean)' },
          { label: 'Collected this month', value: `$${totalPaid.toFixed(2)}`, color: '#22c55e' },
          { label: 'Total outstanding', value: `$${totalOutstanding.toFixed(2)}`, color: totalOutstanding > 0 ? '#ef4444' : '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
            <div className="text-sm text-muted" style={{ marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(b => {
          const paid = b.amount_paid > 0;
          const pastDue = b.months_unpaid > 0;
          const isEditingAmount = editing[b.id] != null;
          const isPaying = paying[b.id] != null;

          return (
            <div key={b.id} className="card card-body" style={pastDue ? { borderLeft: '4px solid #ef4444', background: '#fff8f8' } : {}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {/* Status dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: paid ? '#22c55e' : '#ef4444',
                }} />

                {/* Name + category + past-due badge */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{b.name}</strong>
                    {b.category && <span className="text-sm text-muted">{b.category}</span>}
                    {pastDue && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 999 }}>
                        {b.months_unpaid} {b.months_unpaid === 1 ? 'MONTH' : 'MONTHS'} PAST DUE — ${(b.months_unpaid * b.monthly_amount).toFixed(2)} OWED
                      </span>
                    )}
                  </div>
                  {paid && b.paid_at && (
                    <div className="text-sm" style={{ color: '#16a34a', marginTop: 2 }}>
                      Paid ${b.amount_paid.toFixed(2)} on {formatPaidAt(b.paid_at)}{b.note ? ` — ${b.note}` : ''}
                    </div>
                  )}
                </div>

                {/* Monthly rate */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {isEditingAmount ? (
                    <>
                      <span style={{ fontSize: '0.9rem' }}>$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={editing[b.id]}
                        onChange={e => setEditing(prev => ({ ...prev, [b.id]: e.target.value }))}
                        style={{ width: 70, padding: '4px 6px', fontSize: '0.9rem' }}
                        autoFocus
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => saveAmount(b.id)}>✓</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditing(prev => { const n = { ...prev }; delete n[b.id]; return n; })}>✕</button>
                    </>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Edit monthly rate"
                      onClick={() => setEditing(prev => ({ ...prev, [b.id]: b.monthly_amount.toFixed(2) }))}
                    >
                      ${b.monthly_amount.toFixed(2)}/mo
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!paid && !isPaying && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setPaying(prev => ({ ...prev, [b.id]: { amount: b.monthly_amount.toFixed(2), note: '' } }))}
                    >
                      Record Payment
                    </button>
                  )}
                  {paid && !isPaying && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setPaying(prev => ({ ...prev, [b.id]: { amount: b.amount_paid.toFixed(2), note: b.note || '' } }))}
                    >
                      Edit
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleHistory(b.id)}>
                    {expanded === b.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Inline payment form */}
              {isPaying && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Amount Paid</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={paying[b.id].amount}
                        onChange={e => setPaying(prev => ({ ...prev, [b.id]: { ...prev[b.id], amount: e.target.value } }))}
                        style={{ width: 90 }}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="field" style={{ margin: 0, flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: '0.8rem' }}>Note (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. cash, Venmo…"
                      value={paying[b.id].note}
                      onChange={e => setPaying(prev => ({ ...prev, [b.id]: { ...prev[b.id], note: e.target.value } }))}
                    />
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => recordPayment(b.id)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPaying(prev => { const n = { ...prev }; delete n[b.id]; return n; })}>Cancel</button>
                </div>
              )}

              {/* Payment history */}
              {expanded === b.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>Payment History</p>
                  {!history[b.id] ? <div className="spinner" style={{ width: 20, height: 20, margin: '8px 0' }} /> :
                    history[b.id].length === 0 ? <p className="text-sm text-muted">No payments recorded yet.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {history[b.id].map((p, i) => (
                          <div key={i} className="text-sm" style={{ display: 'flex', gap: 12 }}>
                            <span style={{ color: 'var(--mid)', minWidth: 80 }}>{MONTH_NAMES[p.month - 1]} {p.year}</span>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>${p.amount_paid.toFixed(2)}</span>
                            <span style={{ color: 'var(--mid)' }}>received {formatPaidAt(p.paid_at)}</span>
                            {p.note && <span style={{ color: 'var(--mid)' }}>— {p.note}</span>}
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
            <button className={`btn btn-sm ${tab === 'businesses' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('businesses')}>🏪 Businesses</button>
            <button className={`btn btn-sm ${tab === 'billing' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('billing')}>💳 Billing</button>
            <button className={`btn btn-sm ${tab === 'notifications' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('notifications')}>
              🔔 Notifications{notifications.filter(n => !n.is_read).length > 0 ? ` (${notifications.filter(n => !n.is_read).length})` : ''}
            </button>
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

            {tab === 'billing' && <BillingTab />}

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
