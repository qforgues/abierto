import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PREF_KEY = 'abierto_island';

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState(localStorage.getItem(PREF_KEY) || '(unset)');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setPref(localStorage.getItem(PREF_KEY) || '(unset)');
  }, [location.pathname]);

  const go = (island, route) => {
    if (island) localStorage.setItem(PREF_KEY, island);
    else localStorage.removeItem(PREF_KEY);
    setPref(island || '(unset)');
    navigate(route);
  };

  const btn = (label, onClick, active) => (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        fontSize: '0.78rem',
        fontWeight: active ? 700 : 500,
        background: active ? '#0ea5e9' : '#1e293b',
        color: 'white',
        border: active ? '1px solid #38bdf8' : '1px solid #334155',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Dev panel"
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          background: '#0f172a', color: '#94a3b8', border: '1px solid #334155',
          borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem',
          cursor: 'pointer', opacity: 0.7,
        }}
      >
        DEV
      </button>
    );
  }

  const route = location.pathname;

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
      background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
      padding: '12px 14px', minWidth: 220, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em' }}>DEV PANEL</span>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: 4 }}>
        route: <span style={{ color: '#e2e8f0' }}>{route}</span>
      </div>
      <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: 12 }}>
        pref: <span style={{ color: '#e2e8f0' }}>{pref}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {btn('🏝 VQS', () => go('vieques', '/vieques'), route === '/vieques')}
        {btn('🐢 CUL', () => go('culebra', '/culebra'), route === '/culebra')}
        {btn('🇵🇷 PR', () => go(null, '/'), route === '/')}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {btn('📍 Auto', () => { localStorage.setItem(PREF_KEY, 'auto'); setPref('auto'); navigate('/'); }, pref === 'auto')}
        {btn('🗑 Clear', () => go(null, '/'), false)}
      </div>
    </div>
  );
}
