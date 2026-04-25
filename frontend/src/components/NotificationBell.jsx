import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = () => api.get('/notifications/unread-count').then(d => setCount(d.count)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link to="/admin?tab=notifications" style={{ position: 'relative', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {count > 0 && (
        <span className="notif-badge">{count > 99 ? '99+' : count}</span>
      )}
    </Link>
  );
}
