import React from 'react';

const OPTIONS = ['Open', 'Closed', 'Opening Late', 'Back Soon', 'Sold Out'];

export default function StatusSelector({ value, onChange }) {
  return (
    <div className="status-selector">
      {OPTIONS.map((opt) => (
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
  );
}
