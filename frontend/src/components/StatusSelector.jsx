import React from 'react';
import { useLang } from '../context/LangContext';

const MANUAL_OPTIONS   = ['Open', 'Closed'];
const OVERRIDE_OPTIONS = ['Out to Lunch', 'Closed for the Season'];

// Format "14:30" → "2:30 PM"
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function StatusSelector({
  value, onChange,
  returnTime, onReturnTimeChange,
  returnDate, onReturnDateChange,
  hasHours,
}) {
  const { t } = useLang();
  const ow = t.owner;
  const options = hasHours ? OVERRIDE_OPTIONS : [...MANUAL_OPTIONS, ...OVERRIDE_OPTIONS];

  return (
    <div>
      <div className="status-selector">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`status-selector-btn ${value === opt ? `active-${opt.replace(/\s+/g, '-')}` : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      {hasHours && (
        <p className="text-sm text-muted" style={{ marginTop: 8 }}>
          {ow.autoHours}
        </p>
      )}

      {value === 'Out to Lunch' && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>{ow.backAt}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="time"
              value={returnTime || ''}
              onChange={e => onReturnTimeChange(e.target.value)}
              style={{ flex: 1, maxWidth: 160 }}
            />
            {returnTime && (
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ocean)' }}>
                {fmt12(returnTime)}
              </span>
            )}
          </div>
          {returnTime && (
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              {ow.shownAs.replace('{time}', fmt12(returnTime))}
            </p>
          )}
        </div>
      )}

      {value === 'Closed for the Season' && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>{ow.reopening}</label>
          <input
            type="date"
            value={returnDate || ''}
            onChange={e => onReturnDateChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
