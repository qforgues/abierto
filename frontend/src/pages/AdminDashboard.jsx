import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import StatusSelector from '../components/StatusSelector';
import HoursEditor from '../components/HoursEditor';
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
  const [forgiving, setForgiving] = useState({});

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
    setHistory(prev => { const n = { ...prev }; delete n[businessId]; return n; });
    load();
  };

  const forgiveMonth = async (businessId) => {
    const f = forgiving[businessId];
    if (!f) return;
    await api.post(`/subscriptions/${businessId}/forgive`, { year: f.year, month: f.month });
    setForgiving(prev => { const n = { ...prev }; delete n[businessId]; return n; });
    setHistory(prev => { const n = { ...prev }; delete n[businessId]; return n; });
    load();
  };

  const openForgive = (businessId) => {
    const now = data ? { year: data.year, month: data.month } : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    setForgiving(prev => ({ ...prev, [businessId]: now }));
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
          const isForgiven = b.note === 'Forgiven' && b.amount_paid === 0;
          const isForgiving = forgiving[b.id] != null;

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
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                  {!paid && !isForgiven && !isPaying && !isForgiving && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setPaying(prev => ({ ...prev, [b.id]: { amount: b.monthly_amount.toFixed(2), note: '' } }))}
                    >
                      Record Payment
                    </button>
                  )}
                  {!paid && !isForgiven && !isForgiving && !isPaying && (
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ color: '#d97706', borderColor: '#fde68a' }}
                      onClick={() => openForgive(b.id)}
                    >
                      Forgive
                    </button>
                  )}
                  {(paid || isForgiven) && !isPaying && !isForgiving && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setPaying(prev => ({ ...prev, [b.id]: { amount: b.amount_paid?.toFixed(2) ?? '0.00', note: b.note || '' } }))}
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

              {/* Inline forgive form */}
              {isForgiving && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', background: '#fffbeb', borderRadius: 8, padding: 12 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Year</label>
                    <input
                      type="number" min="2024" max="2099"
                      value={forgiving[b.id].year}
                      onChange={e => setForgiving(prev => ({ ...prev, [b.id]: { ...prev[b.id], year: parseInt(e.target.value) } }))}
                      style={{ width: 80 }}
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Month</label>
                    <select
                      value={forgiving[b.id].month}
                      onChange={e => setForgiving(prev => ({ ...prev, [b.id]: { ...prev[b.id], month: parseInt(e.target.value) } }))}
                      style={{ width: 100 }}
                    >
                      {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-sm" style={{ background: '#d97706', color: 'white' }} onClick={() => forgiveMonth(b.id)}>Forgive Month</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setForgiving(prev => { const n = { ...prev }; delete n[b.id]; return n; })}>Cancel</button>
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
                          <div key={i} className="text-sm" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ color: 'var(--mid)', minWidth: 80 }}>{MONTH_NAMES[p.month - 1]} {p.year}</span>
                            {p.forgiven ? (
                              <span style={{ color: '#d97706', fontWeight: 600 }}>✦ Forgiven</span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>${p.amount_paid.toFixed(2)}</span>
                            )}
                            <span style={{ color: 'var(--mid)' }}>{formatPaidAt(p.paid_at)}</span>
                            {p.note && !p.forgiven && <span style={{ color: 'var(--mid)' }}>— {p.note}</span>}
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

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        position: 'relative', width: 52, height: 28,
        borderRadius: 999, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--ocean)' : '#cbd5e1',
        transition: 'background 0.2s', flexShrink: 0, padding: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 4, left: checked ? 28 : 4,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );
}

function SettingsTab() {
  const [settings, setSettings] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    api.get('/settings').then(setSettings).catch(() => {});
  }, []);

  const toggle = async (key) => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    try {
      await api.patch('/settings', { [key]: updated[key] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSettings(settings); // revert
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="spinner" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600 }}>
      <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>📲 PWA Install Banner</div>
          <div className="text-sm text-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Shows "Add to Home Screen" prompt on mobile devices. Visitors can install Abierto? like an app — no App Store required.
          </div>
          <div className="text-sm" style={{ marginTop: 6, color: settings.pwa_enabled ? 'var(--ocean)' : 'var(--mid)', fontWeight: 600 }}>
            {settings.pwa_enabled ? '✓ Enabled — banner is live' : '✕ Disabled — banner is hidden'}
          </div>
          {saved && <div className="text-sm" style={{ color: '#22c55e', marginTop: 4 }}>Saved!</div>}
        </div>
        <ToggleSwitch
          checked={settings.pwa_enabled}
          onChange={() => toggle('pwa_enabled')}
          disabled={saving}
        />
      </div>
      <p className="text-sm text-muted" style={{ paddingLeft: 4 }}>
        Turn this off when preparing to publish to the Play Store.
      </p>
    </div>
  );
}

function TrafficTab() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api.get('/analytics/summary').then(setData).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="spinner" />;

  const { summary, daily, topPages } = data;
  const maxVisits = Math.max(...daily.map(d => d.visits), 1);

  const cards = [
    { label: 'Today',      visits: summary.today.visits,  unique: summary.today.unique },
    { label: 'This Week',  visits: summary.week.visits,   unique: summary.week.unique },
    { label: 'This Month', visits: summary.month.visits,  unique: summary.month.unique },
    { label: 'All Time',   visits: summary.allTime,       unique: null },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {cards.map(({ label, visits, unique }) => (
          <div key={label} className="card card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--ocean)' }}>{visits.toLocaleString()}</div>
            <div style={{ fontWeight: 600, marginTop: 2, fontSize: '0.85rem' }}>{label}</div>
            {unique !== null && <div className="text-sm text-muted">{unique} unique</div>}
          </div>
        ))}
      </div>

      {/* Homepage vs business page split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ocean)' }}>{summary.homeVisits.toLocaleString()}</div>
          <div className="text-sm text-muted" style={{ marginTop: 4 }}>Homepage visits (all time)</div>
        </div>
        <div className="card card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ocean)' }}>{(summary.allTime - summary.homeVisits).toLocaleString()}</div>
          <div className="text-sm text-muted" style={{ marginTop: 4 }}>Business page views (all time)</div>
        </div>
      </div>

      {/* Daily bar chart */}
      {daily.length > 0 && (
        <div className="card card-body">
          <h3 style={{ marginBottom: 20 }}>Last 14 Days</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, paddingBottom: 24, position: 'relative' }}>
            {daily.map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div
                  title={`${d.visits} visits, ${d.unique_visitors} unique`}
                  style={{
                    width: '100%',
                    height: `${Math.max(Math.round((d.visits / maxVisits) * 80), 2)}px`,
                    background: 'linear-gradient(180deg, var(--turquoise), var(--ocean))',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s',
                    cursor: 'default',
                  }}
                />
                <span style={{
                  position: 'absolute', bottom: -20,
                  fontSize: '0.6rem', color: 'var(--mid)',
                  whiteSpace: 'nowrap',
                }}>
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span className="text-sm text-muted">Peak: {maxVisits} visits/day</span>
            <span className="text-sm text-muted">Total: {daily.reduce((s, d) => s + d.visits, 0)} over {daily.length} days</span>
          </div>
        </div>
      )}

      {/* Top business pages */}
      {topPages.length > 0 && (
        <div className="card card-body">
          <h3 style={{ marginBottom: 14 }}>Most Viewed Businesses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPages.map((p, i) => {
              const pct = Math.round((p.visits / topPages[0].visits) * 100);
              return (
                <div key={p.path}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ width: 20, textAlign: 'right', color: 'var(--mid)', fontSize: '0.8rem', fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--ocean)', fontSize: '0.9rem' }}>{p.visits}</span>
                  </div>
                  <div style={{ marginLeft: 30, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ocean)', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {daily.length === 0 && topPages.length === 0 && (
        <p className="text-center text-muted mt-4">No traffic data yet — data appears as visitors use the app.</p>
      )}
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

function AdminBusinessEditor({ businessId, onStatusSaved }) {
  const [status, setStatus] = useState('Closed');
  const [returnTime, setReturnTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [hasHours, setHasHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/businesses/${businessId}/status`),
      api.get(`/businesses/${businessId}/hours`),
    ]).then(([s, h]) => {
      setStatus(s.status || 'Closed');
      setReturnTime(s.return_time || '');
      setReturnDate(s.return_date || '');
      setHasHours(h.length > 0);
    }).catch(() => {});
  }, [businessId]);

  const saveStatus = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.put(`/businesses/${businessId}/status`, {
        status,
        return_time: returnTime || undefined,
        return_date: returnDate || undefined,
      });
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 2000);
      if (onStatusSaved) onStatusSaved();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--mid)' }}>Status</p>
        <StatusSelector
          value={status}
          onChange={setStatus}
          returnTime={returnTime}
          onReturnTimeChange={setReturnTime}
          returnDate={returnDate}
          onReturnDateChange={setReturnDate}
          hasHours={hasHours}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={saveStatus} disabled={saving}>
            {saving ? 'Saving…' : 'Save Status'}
          </button>
          {msg && <span className={msg.startsWith('Error') ? 'text-error' : 'text-success'} style={{ fontSize: '0.875rem' }}>{msg}</span>}
        </div>
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--mid)' }}>Hours</p>
        <HoursEditor businessId={businessId} onSaved={() => setHasHours(true)} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'businesses';
  const [tab, setTab] = useState(tabParam);
  const [businesses, setBusinesses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { setTab(tabParam); }, [tabParam]);

  const switchTab = (t) => {
    setTab(t);
    setSearchParams(t !== 'businesses' ? { tab: t } : {});
  };

  const loadBusinesses = useCallback(() =>
    api.get('/businesses/admin/all').then(setBusinesses), []);

  const loadNotifications = useCallback(() =>
    api.get('/notifications').then(setNotifications), []);

  useEffect(() => {
    Promise.all([loadBusinesses(), loadNotifications()])
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false));
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
            <button className={`btn btn-sm ${tab === 'businesses' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('businesses')}>🏪 Businesses</button>
            <button className={`btn btn-sm ${tab === 'billing' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('billing')}>💳 Billing</button>
            <button className={`btn btn-sm ${tab === 'notifications' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('notifications')}>
              🔔 Notifications{notifications.filter(n => !n.is_read).length > 0 ? ` (${notifications.filter(n => !n.is_read).length})` : ''}
            </button>
            <button className={`btn btn-sm ${tab === 'traffic' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('traffic')}>📊 Traffic</button>
            <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab('settings')}>⚙️ Settings</button>
          </div>
        </div>

        {loadError && <div className="alert alert-error" style={{ marginBottom: 16 }}>Failed to load: {loadError} — try refreshing or logging in again.</div>}
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
                          {b.is_active && (
                            <button
                              className={`btn btn-sm ${editingId === b.id ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => setEditingId(editingId === b.id ? null : b.id)}
                            >
                              {editingId === b.id ? 'Done' : 'Edit'}
                            </button>
                          )}
                          {b.is_active
                            ? <button className="btn btn-danger btn-sm" onClick={() => remove(b.id)}>Remove</button>
                            : <button className="btn btn-ghost btn-sm" onClick={() => restore(b.id)}>Restore</button>
                          }
                        </div>
                      </div>
                      {editingId === b.id && (
                        <AdminBusinessEditor
                          businessId={b.id}
                          onStatusSaved={loadBusinesses}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'billing' && <BillingTab />}
            {tab === 'traffic' && <TrafficTab />}
            {tab === 'settings' && <SettingsTab />}

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
