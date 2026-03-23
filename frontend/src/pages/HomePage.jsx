import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapView from '../components/MapView';
import BusinessCard from '../components/BusinessCard';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import '../styles/HomePage.css';
import { CATEGORY_ICONS } from '../constants/categories';

const CATEGORIES = ['All', 'Restaurant', 'Food Truck', 'Bar', 'Cafe', 'Shop', 'Service', 'Beach', 'Other', 'Closed'];

export default function HomePage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const { t, lang, toggle } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchBusinesses = () =>
    api.get('/businesses')
      .then(setBusinesses)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchBusinesses();
    api.post('/analytics/hit', { path: '/' }).catch(() => {});
    const interval = setInterval(fetchBusinesses, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {}
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const OPEN_STATUSES = ['Open', 'Open 24 Hours', 'Opening Late', 'Back Soon'];
  const filtered = filter === 'All'
    ? businesses.filter(b => OPEN_STATUSES.includes(b.status))
    : filter === 'Closed'
      ? businesses.filter(b => !OPEN_STATUSES.includes(b.status))
      : businesses.filter(b => b.category === filter && OPEN_STATUSES.includes(b.status));

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="home-wrapper">

      {/* ── Hero: logo left, map right ── */}
      <div className="home-hero">
        <div className="home-logo-panel">
          <img src="/combined-logo.png" alt="Abierto?" />
        </div>
        <div className="home-map-panel">
          <div className="map-wrap">
            <MapView businesses={businesses} userLocation={userLocation} />
          </div>
        </div>
      </div>

      {/* ── Category filters ── */}
      <div className="home-filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
            style={{ whiteSpace: 'nowrap', gap: 4 }}
          >
            <span>{CATEGORY_ICONS[cat]}</span>{t.categories[cat]}
          </button>
        ))}
      </div>

      {/* ── Business list ── */}
      <div className="home-list">
        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted mt-6">
            <p>{t.noBusinesses} <Link to="/register" style={{ color: 'var(--ocean)' }}>{t.addYours}</Link></p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(b => <BusinessCard key={b.id} business={b} userLocation={userLocation} />)}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="home-footer-auth">
          {!user && (
            <>
              <Link to="/register" className="footer-link-gold">{t.addBusiness}</Link>
              <Link to="/login" className="footer-link-ghost">{t.login}</Link>
            </>
          )}
          {user?.role === 'owner' && (
            <>
              <Link to="/owner" className="footer-link-plain">{t.myBusiness}</Link>
              <button onClick={handleLogout} className="footer-btn-plain">{t.logout}</button>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link to="/admin" className="footer-link-plain">{t.dashboard}</Link>
              <button onClick={handleLogout} className="footer-btn-plain">{t.logout}</button>
            </>
          )}
        </div>

        <div className="home-footer-brand">
          <span className="footer-copy">© 2025 Abierto?</span>
          <span className="footer-version">v{__APP_VERSION__}</span>
          <button
            onClick={toggle}
            className="footer-lang-btn"
            title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
          >
            {lang === 'en' ? '🇵🇷' : '🇺🇸'}
          </button>
        </div>
      </footer>
    </div>
  );
}
