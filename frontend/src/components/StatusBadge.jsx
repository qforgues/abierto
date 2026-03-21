import React from 'react';

const DOT = { Open: '🟢', Closed: '🔴', 'Opening Late': '🟡', 'Back Soon': '🟡', 'Sold Out': '🟣' };

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
