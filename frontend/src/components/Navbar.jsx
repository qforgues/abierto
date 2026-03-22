import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import NotificationBell from './NotificationBell';

const styles = {
  nav: {
    background: 'var(--nav-gradient)',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '60px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.22)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    isolation: 'isolate',
  },
  brand: {
    fontFamily: "'Pacifico', cursive",
    fontSize: '1.6rem',
    color: 'white',
    textDecoration: 'none',
    letterSpacing: '-0.5px',
    textShadow: '0 1px 8px rgba(0,0,0,0.18)',
  },
  actions: { display: 'flex', alignItems: 'center', gap: '8px' },
  link: {
    color: 'rgba(255,255,255,0.92)',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: 600,
    padding: '7px 13px',
    borderRadius: '9px',
    transition: 'background 0.15s, color 0.15s',
    letterSpacing: '0.01em',
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, t, toggle } = useLang();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>Abierto</Link>
      <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.82)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        What's open in Vieques?
      </span>
      <div style={styles.actions}>
        {!user && (
          <>
            <Link to="/register" style={styles.link}>{t.addBusiness}</Link>
            <Link to="/login" style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
              {t.login}
            </Link>
          </>
        )}
        {user?.role === 'owner' && (
          <>
            <Link to="/owner" style={styles.link}>{t.myBusiness}</Link>
            <button onClick={handleLogout} style={{ ...styles.link, background: 'none', border: 'none', cursor: 'pointer' }}>
              {t.logout}
            </button>
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <NotificationBell />
            <Link to="/admin" style={styles.link}>{t.dashboard}</Link>
            <button onClick={handleLogout} style={{ ...styles.link, background: 'none', border: 'none', cursor: 'pointer' }}>
              {t.logout}
            </button>
          </>
        )}
        <button
          onClick={toggle}
          title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0 4px' }}
        >
          {lang === 'en' ? '🇵🇷' : '🇺🇸'}
        </button>
      </div>
    </nav>
  );
}
