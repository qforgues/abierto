import React from 'react';
import { useLang } from '../context/LangContext';

// Both flags are always visible. US = English, PR = Español.
// The currently-active language gets a glowing box; click the other to switch.
export default function LangToggle({ size = '1.3rem' }) {
  const { lang, toggle } = useLang();

  const flagStyle = (active) => ({
    fontSize: size,
    lineHeight: 1,
    padding: '3px 5px',
    borderRadius: 8,
    cursor: active ? 'default' : 'pointer',
    background: active ? 'rgba(255,255,255,0.20)' : 'transparent',
    border: active ? '1.5px solid rgba(255,255,255,0.9)' : '1.5px solid transparent',
    boxShadow: active ? '0 0 8px 1.5px rgba(255,255,255,0.6)' : 'none',
    opacity: active ? 1 : 0.5,
    transition: 'all 0.15s',
  });

  const flag = (code, emoji, label) => {
    const active = lang === code;
    return (
      <button
        key={code}
        onClick={() => { if (!active) toggle(); }}
        title={label}
        aria-label={label}
        aria-pressed={active}
        style={flagStyle(active)}
      >
        {emoji}
      </button>
    );
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {flag('en', '🇺🇸', 'English')}
      {flag('es', '🇵🇷', 'Español')}
    </div>
  );
}
