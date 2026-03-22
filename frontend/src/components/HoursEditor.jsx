import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function blankWeek() {
  return DAYS.map((_, i) => ({
    day_of_week: i,
    open_time: '09:00',
    close_time: '21:00',
    is_closed: i === 0, // Sunday closed by default
  }));
}

function mergeWithSaved(saved) {
  const week = blankWeek();
  for (const row of saved) {
    week[row.day_of_week] = {
      day_of_week: row.day_of_week,
      open_time: row.open_time || '09:00',
      close_time: row.close_time || '21:00',
      is_closed: !!row.is_closed,
    };
  }
  return week;
}

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Toggle switch component
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: checked ? 'var(--status-open)' : '#cbd5e1',
        transition: 'background 0.2s',
        flexShrink: 0,
        padding: 0,
      }}
      aria-pressed={checked}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
        display: 'block',
      }} />
    </button>
  );
}

export default function HoursEditor({ businessId, onSaved }) {
  const [hours, setHours] = useState(blankWeek());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/businesses/${businessId}/hours`)
      .then(data => { if (data.length) setHours(mergeWithSaved(data)); })
      .catch(() => {});
  }, [businessId]);

  const update = (i, field, value) =>
    setHours(h => h.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  const copyToAll = (i) => {
    const src = hours[i];
    setHours(h => h.map(d => ({
      ...d,
      open_time: src.open_time,
      close_time: src.close_time,
      is_closed: src.is_closed,
    })));
  };

  const copyToWeekdays = (i) => {
    const src = hours[i];
    setHours(h => h.map(d =>
      d.day_of_week >= 1 && d.day_of_week <= 5
        ? { ...d, open_time: src.open_time, close_time: src.close_time, is_closed: src.is_closed }
        : d
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put(`/businesses/${businessId}/hours`, { hours });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Day rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hours.map((day, i) => {
          const isOpen = !day.is_closed;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: isOpen ? 'var(--light)' : '#f8fafc',
                border: `1.5px solid ${isOpen ? 'var(--border)' : '#e2e8f0'}`,
                transition: 'all 0.15s',
                opacity: isOpen ? 1 : 0.6,
              }}
            >
              {/* Day name */}
              <span style={{
                width: 36,
                fontSize: '0.8rem',
                fontWeight: 700,
                color: isOpen ? 'var(--ocean)' : 'var(--mid)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}>
                {SHORT[i]}
              </span>

              {/* Toggle */}
              <Toggle checked={isOpen} onChange={val => update(i, 'is_closed', !val)} />

              {/* Status label or time pickers */}
              {isOpen ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="time"
                      value={day.open_time}
                      onChange={e => update(i, 'open_time', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.9rem',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        background: 'white',
                        color: 'var(--dark)',
                        fontFamily: 'inherit',
                        outline: 'none',
                        width: 118,
                      }}
                    />
                  </div>
                  <span style={{ color: 'var(--mid)', fontSize: '0.8rem', fontWeight: 600 }}>→</span>
                  <input
                    type="time"
                    value={day.close_time}
                    onChange={e => update(i, 'close_time', e.target.value)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.9rem',
                      border: '1.5px solid var(--border)',
                      borderRadius: 8,
                      background: 'white',
                      color: 'var(--dark)',
                      fontFamily: 'inherit',
                      outline: 'none',
                      width: 118,
                    }}
                  />
                  <span style={{ color: 'var(--mid)', fontSize: '0.78rem', marginLeft: 2 }}>
                    {fmt12(day.open_time)} – {fmt12(day.close_time)}
                  </span>
                </div>
              ) : (
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--mid)', fontWeight: 500 }}>
                  Closed
                </span>
              )}

              {/* Copy menu */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <details style={{ position: 'relative' }}>
                  <summary style={{
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: 'var(--mid)',
                    listStyle: 'none',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'white',
                    userSelect: 'none',
                  }}>
                    Copy ▾
                  </summary>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow)',
                    zIndex: 10,
                    minWidth: 160,
                    overflow: 'hidden',
                  }}>
                    {[
                      { label: 'Copy to all days', action: () => copyToAll(i) },
                      { label: 'Copy to weekdays', action: () => copyToWeekdays(i) },
                    ].map(({ label, action }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={action}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 14px',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          color: 'var(--dark)',
                        }}
                        onMouseEnter={e => e.target.style.background = 'var(--light)'}
                        onMouseLeave={e => e.target.style.background = 'none'}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div>
          {error && <p className="text-error">{error}</p>}
          {saved && <p className="text-success">✓ Hours saved</p>}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ minWidth: 120 }}
        >
          {saving ? 'Saving…' : 'Save Hours'}
        </button>
      </div>
    </div>
  );
}
