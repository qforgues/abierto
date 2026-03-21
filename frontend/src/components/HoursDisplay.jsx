import React, { useState } from 'react';

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'am' : 'pm';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, '0')}${ampm}`;
}

function getStatus(hours) {
  if (!hours?.length) return { open: null, todayRow: null, nextOpen: null };
  const now = new Date();
  const todayIdx = now.getDay();
  const todayRow = hours.find(h => h.day_of_week === todayIdx);
  const cur = now.getHours() * 60 + now.getMinutes();

  let open = null;
  if (todayRow && !todayRow.is_closed && todayRow.open_time && todayRow.close_time) {
    const [oh, om] = todayRow.open_time.split(':').map(Number);
    const [ch, cm] = todayRow.close_time.split(':').map(Number);
    open = cur >= oh * 60 + om && cur < ch * 60 + cm;
  } else if (todayRow?.is_closed) {
    open = false;
  }

  // Find next open day
  let nextOpen = null;
  if (!open) {
    for (let offset = 1; offset <= 7; offset++) {
      const nextIdx = (todayIdx + offset) % 7;
      const nextDay = hours.find(h => h.day_of_week === nextIdx);
      if (nextDay && !nextDay.is_closed && nextDay.open_time) {
        nextOpen = { day: DAYS_FULL[nextIdx], time: fmt(nextDay.open_time), offset };
        break;
      }
    }
  }

  return { open, todayRow, nextOpen };
}

export default function HoursDisplay({ hours }) {
  const [expanded, setExpanded] = useState(false);
  if (!hours?.length) return null;

  const today = new Date().getDay();
  const { open, todayRow, nextOpen } = getStatus(hours);

  // Sort starting from today
  const sorted = [...hours].sort((a, b) => {
    const ai = (a.day_of_week - today + 7) % 7;
    const bi = (b.day_of_week - today + 7) % 7;
    return ai - bi;
  });

  return (
    <div>
      {/* Status banner */}
      {open !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 10,
          background: open ? '#f0fdf4' : '#fff7ed',
          border: `1.5px solid ${open ? '#86efac' : '#fed7aa'}`,
          marginBottom: 16,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: open ? 'var(--status-open)' : '#f97316',
            boxShadow: open ? '0 0 0 3px #bbf7d0' : '0 0 0 3px #fed7aa',
          }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: open ? '#166534' : '#9a3412' }}>
              {open ? 'Open now' : 'Closed now'}
            </p>
            {open && todayRow && (
              <p style={{ fontSize: '0.82rem', color: '#15803d', marginTop: 1 }}>
                Closes at {fmt(todayRow.close_time)}
              </p>
            )}
            {!open && nextOpen && (
              <p style={{ fontSize: '0.82rem', color: '#c2410c', marginTop: 1 }}>
                Opens {nextOpen.offset === 1 ? 'tomorrow' : nextOpen.day} at {nextOpen.time}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hours list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(expanded ? sorted : sorted.slice(0, 3)).map(day => {
          const isToday = day.day_of_week === today;
          const isClosed = day.is_closed;
          return (
            <div
              key={day.day_of_week}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: 8,
                background: isToday ? '#eff6ff' : 'transparent',
              }}
            >
              <span style={{
                fontSize: '0.875rem',
                fontWeight: isToday ? 700 : 500,
                color: isToday ? 'var(--ocean)' : isClosed ? '#94a3b8' : 'var(--dark)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ocean)', display: 'inline-block' }} />}
                {DAYS_FULL[day.day_of_week]}
              </span>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: isToday ? 600 : 400,
                color: isClosed ? '#94a3b8' : isToday ? 'var(--ocean)' : 'var(--mid)',
              }}>
                {isClosed ? 'Closed'
                  : (day.open_time && day.close_time)
                  ? `${fmt(day.open_time)} – ${fmt(day.close_time)}`
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {hours.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ocean)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 10px',
            marginTop: 2,
          }}
        >
          {expanded ? '▲ Show less' : `▼ See all hours`}
        </button>
      )}
    </div>
  );
}
