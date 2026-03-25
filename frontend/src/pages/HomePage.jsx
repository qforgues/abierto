import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapView from '../components/MapView';
import BusinessCard from '../components/BusinessCard';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import '../styles/HomePage.css';
import { CATEGORY_ICONS } from '../constants/categories';

const CATEGORIES = ['All', 'Restaurant', 'Bar', 'Beach', 'Attraction', 'Cafe', 'Food Truck', 'Shop', 'Park', 'Service', 'Transportation', 'Other', 'Closed'];

export default function HomePage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(null); // 'sending' | 'done' | 'error'
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

  const OPEN_STATUSES = ['Open', 'Opening Late', 'Back Soon'];
  const filtered = filter === 'All'
    ? businesses.filter(b => OPEN_STATUSES.includes(b.status))
    : filter === 'Closed'
      ? businesses.filter(b => !OPEN_STATUSES.includes(b.status))
      : businesses.filter(b => b.category === filter && OPEN_STATUSES.includes(b.status));

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackMsg.trim()) return;
    setFeedbackStatus('sending');
    try {
      await api.post('/notifications/feedback', { message: feedbackMsg });
      setFeedbackStatus('done');
      setTimeout(() => { setFeedbackOpen(false); setFeedbackMsg(''); setFeedbackStatus(null); }, 1500);
    } catch {
      setFeedbackStatus('error');
    }
  };

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
              <button onClick={() => { void handleLogout(); }} className="footer-btn-plain">{t.logout}</button>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link to="/admin" className="footer-link-plain">{t.dashboard}</Link>
              <button onClick={() => { void handleLogout(); }} className="footer-btn-plain">{t.logout}</button>
            </>
          )}
        </div>

        <button onClick={() => setFeedbackOpen(true)} className="footer-lang-btn" title="Give Feedback" style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.9 10.2 19 8.7 19 7a7 7 0 1 0-13.4 2.8C6.4 11.6 7 12.5 7 14"/>
            <path d="M9 14h6"/><path d="M9 18h6"/><path d="M10 22h4"/>
          </svg>
        </button>

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

      {/* ── Feedback modal ── */}
      {feedbackOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card card-body" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>Give Feedback</h2>
            <p className="text-muted text-sm" style={{ margin: 0 }}>Ideas, suggestions, or anything on your mind — it goes straight to the admin.</p>
            <textarea
              rows={4}
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value)}
              placeholder="Your feedback..."
              style={{ resize: 'vertical' }}
              autoFocus
            />
            {feedbackStatus === 'done' && <p style={{ color: 'var(--teal)', margin: 0 }}>✓ Sent! Thanks.</p>}
            {feedbackStatus === 'error' && <p style={{ color: 'var(--danger)', margin: 0 }}>Something went wrong. Try again.</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setFeedbackOpen(false); setFeedbackMsg(''); setFeedbackStatus(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFeedbackSubmit} disabled={feedbackStatus === 'sending' || !feedbackMsg.trim()}>
                {feedbackStatus === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
