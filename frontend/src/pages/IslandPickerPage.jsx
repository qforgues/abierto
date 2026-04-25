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
      <div className="page" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '78vh',
        gap: 32,
        padding: '40px 24px',
      }}>

        {/* Logo + headline */}
        <div style={{ textAlign: 'center' }}>
          <img src="/combined-logo.png" alt="Abierto" style={{ height: 280, marginBottom: 14 }} />
          <p style={{ color: 'var(--mid)', fontSize: '1.15rem', margin: 0, fontWeight: 500 }}>
            Where are you?
          </p>
        </div>

        {/* Location button */}
        <button
          className="btn btn-primary"
          onClick={handleUseLocation}
          disabled={detecting}
          style={{ width: '100%', maxWidth: 380, fontSize: '1rem', padding: '14px 0' }}
        >
          {detecting ? '📍 Detecting…' : '📍 Use My Location'}
        </button>

        {error && (
          <p style={{ color: 'var(--mid)', fontSize: '0.88rem', textAlign: 'center', maxWidth: 300, margin: '-12px 0 0' }}>
            {error}
          </p>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 560 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--mid)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>or pick your island</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Island cards — 3 equal columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          width: '100%',
          maxWidth: 680,
        }}>
          {Object.values(ISLANDS).map(island => (
            <IslandCard
              key={island.key}
              name={island.name}
              imgSrc={`/island-${island.key}.jpeg`}
              imgScale={island.key === 'culebra' ? 1.55 : 1}
              onClick={() => handleSelect(island.key)}
            />
          ))}

          {/* Coming soon placeholder */}
          <div style={{
            background: 'white',
            border: '2px dashed var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            opacity: 0.6,
            cursor: 'default',
          }}>
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              background: 'var(--light)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: '2rem' }}>🗺️</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--mid)', fontWeight: 600, letterSpacing: '0.03em' }}>
                COMING SOON
              </span>
            </div>
            <div style={{ padding: '10px 0 12px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--mid)', textAlign: 'center' }}>
              More Islands
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--mid)', fontSize: '0.78rem', textAlign: 'center', margin: '-8px 0 0' }}>
          Using location always shows you where you are
        </p>
      </div>
    </>
  );
}

function IslandCard({ name, imgSrc, imgScale = 1, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        border: `2px solid ${hovered ? 'var(--ocean)' : 'var(--border)'}`,
        borderRadius: 16,
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        boxShadow: hovered ? '0 6px 24px rgba(45,212,191,0.22)' : 'none',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        background: 'white',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <img
          src={imgSrc}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transform: `scale(${imgScale})`,
            transformOrigin: 'center center',
          }}
        />
      </div>
      <div style={{
        padding: '10px 0 12px',
        fontWeight: 700,
        fontSize: '0.95rem',
        color: 'var(--dark)',
        textAlign: 'center',
      }}>
        {name}
      </div>
    </button>
  );
}
