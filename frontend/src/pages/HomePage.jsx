import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import BusinessCard from '../components/BusinessCard';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';

const CATEGORIES = ['All', 'Restaurant', 'Food Truck', 'Bar', 'Cafe', 'Shop', 'Service', 'Beach', 'Other', 'Closed'];

export default function HomePage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const { t } = useLang();

  const fetchBusinesses = () =>
    api.get('/businesses')
      .then(setBusinesses)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchBusinesses();
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

  return (
    <>
      <Navbar />
      <div className="page" style={{ paddingTop: 24 }}>
        <div style={{ margin: '0 0 16px', overflowX: 'auto', display: 'flex', gap: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t.categories[cat]}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <MapView businesses={businesses} userLocation={userLocation} />
        </div>

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
    </>
  );
}
