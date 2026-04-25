import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import NotificationBell from './NotificationBell';
import { ISLANDS } from '../constants/islands';

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
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
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
  const location = useLocation();
  const currentIsland = Object.keys(ISLANDS).find(k => location.pathname.startsWith('/' + k)) || null;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        <img src="/logo-solo.png" alt="Abierto?" style={{ height: 44, filter: 'brightness(0) invert(1) drop-shadow(0 1px 4px rgba(0,0,0,0.4))' }} />
      </Link>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2 }}>
        {Object.values(ISLANDS).map(island => (
          <Link
            key={island.key}
            to={'/' + island.key}
            onClick={() => localStorage.setItem('abierto_island', island.key)}
            style={{
              color: currentIsland === island.key ? 'white' : 'rgba(255,255,255,0.45)',
              fontWeight: currentIsland === island.key ? 700 : 500,
              fontSize: '0.9rem',
              padding: '5px 10px',
              borderRadius: 8,
              background: currentIsland === island.key ? 'rgba(255,255,255,0.18)' : 'transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {island.name}
          </Link>
        ))}
        {currentIsland && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>·</span>
            <Link to={`/${currentIsland}/events`} style={{ color: location.pathname.includes('/events') ? 'white' : 'rgba(255,255,255,0.55)', fontWeight: location.pathname.includes('/events') ? 700 : 500, fontSize: '0.9rem', padding: '5px 10px', borderRadius: 8, background: location.pathname.includes('/events') ? 'rgba(255,255,255,0.18)' : 'transparent', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              Events
            </Link>
          </>
        )}
      </div>
      <div style={styles.actions}>
        {!user && (
          <>
            <Link to="/register" className="nav-hide-mobile" style={styles.link}>{t.addBusiness}</Link>
            <Link to="/login" style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
              {t.login}
            </Link>
          </>
        )}
        {user?.role === 'owner' && (
          <>
            <Link to="/owner" style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)' }}>{t.myBusiness}</Link>
            <button onClick={() => { void handleLogout(); }} style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              {t.logout}
            </button>
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <NotificationBell />
            <Link to="/admin" style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)' }}>{t.dashboard}</Link>
            <button onClick={() => { void handleLogout(); }} style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              {t.logout}
            </button>
          </>
        )}
        {user?.role === 'coordinator' && (
          <>
            <Link to="/coordinator" style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)' }}>My Events</Link>
            <button onClick={() => { void handleLogout(); }} style={{ ...styles.link, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
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
