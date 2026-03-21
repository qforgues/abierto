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
    <Link to="/admin" style={{ position: 'relative', color: 'white', fontSize: '1.3rem', textDecoration: 'none' }}>
      🔔
      {count > 0 && (
        <span className="notif-badge">{count > 99 ? '99+' : count}</span>
      )}
    </Link>
  );
}
