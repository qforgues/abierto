import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const styles = {
  nav: {
    background: 'var(--ocean)',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  brand: {
    fontFamily: "'Pacifico', cursive",
    fontSize: '1.5rem',
    color: 'white',
    textDecoration: 'none',
    letterSpacing: '-0.5px',
  },
  actions: { display: 'flex', alignItems: 'center', gap: '10px' },
  link: {
    color: 'rgba(255,255,255,0.9)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: '8px',
    transition: 'background 0.15s',
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>Abierto</Link>
      <div style={styles.actions}>
        {!user && (
          <>
            <Link to="/register" style={styles.link}>Add Business</Link>
            <Link to="/login" style={{ ...styles.link, background: 'rgba(255,255,255,0.15)' }}>
              Login
            </Link>
          </>
        )}
        {user?.role === 'owner' && (
          <>
            <Link to="/owner" style={styles.link}>My Business</Link>
            <button onClick={handleLogout} style={{ ...styles.link, background: 'none', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <NotificationBell />
            <Link to="/admin" style={styles.link}>Dashboard</Link>
            <button onClick={handleLogout} style={{ ...styles.link, background: 'none', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
