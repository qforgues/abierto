import React from 'react';

const DOT = {
  Open: '🟢',
  Closed: '🔴',
  'Out to Lunch': '🟡',
  'Closed for the Season': '⛔',
};

export default function StatusBadge({ status, large }) {
  if (!status) return <span className="status-badge none">No Status</span>;
  const cls = status.replace(/\s+/g, '-');
  return (
    <span
      className={`status-badge ${cls}`}
      style={large ? { fontSize: '1.1rem', padding: '8px 18px' } : {}}
    >
      {DOT[status] || '⚪'} {status}
    </span>
  );
}
