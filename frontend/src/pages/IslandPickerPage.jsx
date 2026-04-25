import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ISLANDS, detectIsland } from '../constants/islands';

const PREF_KEY = 'abierto_island';

export default function IslandPickerPage() {
  const navigate = useNavigate();
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved === 'auto') {
      tryDetect();
    } else if (saved && ISLANDS[saved]) {
      navigate('/' + saved, { replace: true });
    }
  }, []);

  const tryDetect = () => {
    if (!navigator.geolocation) {
      setError('Location not available on this device.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        const island = detectIsland(pos.coords.latitude, pos.coords.longitude);
        if (island) {
          navigate('/' + island, { replace: true });
        } else {
          setError("You don't seem to be on a supported island right now. Pick one below.");
        }
      },
      () => {
        setDetecting(false);
        setError('Location access denied. Pick your island below.');
      },
      { timeout: 8000 }
    );
  };

  const handleUseLocation = () => {
    localStorage.setItem(PREF_KEY, 'auto');
    tryDetect();
  };

  const handleSelect = (key) => {
    localStorage.setItem(PREF_KEY, key);
    navigate('/' + key);
  };

  return (
    <>
      <Navbar />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '78vh', gap: 28, padding: '32px 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/combined-logo.png" alt="Abierto" style={{ height: 72, marginBottom: 16 }} />
          <p style={{ color: 'var(--mid)', fontSize: '1.05rem', margin: 0 }}>Where are you?</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleUseLocation}
          disabled={detecting}
          style={{ width: '100%', maxWidth: 320, fontSize: '1rem', padding: '13px 0' }}
        >
          {detecting ? '📍 Detecting…' : '📍 Use My Location'}
        </button>

        {error && (
          <p style={{ color: 'var(--mid)', fontSize: '0.88rem', textAlign: 'center', maxWidth: 280, margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--mid)', fontSize: '0.82rem' }}>or pick your island</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%', maxWidth: 360 }}>
          {Object.values(ISLANDS).map(island => (
            <button
              key={island.key}
              onClick={() => handleSelect(island.key)}
              style={{
                background: 'white',
                border: '2px solid var(--border)',
                borderRadius: 16,
                padding: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ocean)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,212,191,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <img
                src={`/island-${island.key}.jpeg`}
                alt={island.name}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '10px 0 12px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
                {island.name}
              </div>
            </button>
          ))}
        </div>

        <p style={{ color: 'var(--mid)', fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>
          Using location always shows you where you are
        </p>
      </div>
    </>
  );
}
