import React from 'react';

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
          Open/Closed is set automatically from your hours.
        </p>
      )}

      {value === 'Out to Lunch' && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Back at</label>
          <input
            type="time"
            value={returnTime || ''}
            onChange={e => onReturnTimeChange(e.target.value)}
          />
          {returnTime && (
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              Shown as: "Back at {fmt12(returnTime)}" — auto-clears when time passes
            </p>
          )}
        </div>
      )}

      {value === 'Closed for the Season' && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Reopening</label>
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
