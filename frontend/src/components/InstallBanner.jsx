import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const DISMISSED_KEY = 'abierto_pwa_dismissed';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if user dismissed before
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS standalone

    api.get('/settings').then(data => {
      if (!data.pwa_enabled) return;

      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
      if (ios) {
        setIsIOS(true);
        setShow(true);
      } else {
        // Chrome/Android: wait for browser's install prompt
        const handler = (e) => {
          e.preventDefault();
          setPrompt(e);
          setShow(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
      }
    }).catch(() => {});
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setShow(false);
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1');
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'white',
      borderTop: '3px solid var(--ocean)',
      padding: '14px 16px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.16)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <img
        src="/logo-solo.png"
        alt=""
        style={{ height: 40, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
          Add Abierto? to your home screen
        </div>
        {isIOS ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--mid)', marginTop: 3 }}>
            Tap <strong>Share</strong> <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⎙</span> then <strong>"Add to Home Screen"</strong>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--mid)', marginTop: 3 }}>
            Opens like an app — no App Store needed
          </div>
        )}
      </div>
      {!isIOS && (
        <button
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0, padding: '8px 16px' }}
          onClick={install}
        >
          Add
        </button>
      )}
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--mid)',
          fontSize: '1.3rem',
          lineHeight: 1,
          flexShrink: 0,
          padding: '0 2px',
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
