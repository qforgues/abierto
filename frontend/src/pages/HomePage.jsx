import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import BusinessCard from '../components/BusinessCard';
import { api } from '../api/client';

const CATEGORIES = ['All', 'Restaurant', 'Food Truck', 'Bar', 'Cafe', 'Shop', 'Service', 'Beach', 'Other'];

export default function HomePage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/businesses')
      .then(setBusinesses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? businesses : businesses.filter(b => b.category === filter);

  return (
    <>
      <Navbar />
      <div style={{ background: 'linear-gradient(135deg, var(--ocean) 0%, var(--turquoise) 100%)', padding: '32px 20px', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontFamily: "'Pacifico', cursive", fontSize: '2.5rem', marginBottom: 8 }}>Abierto</h1>
        <p style={{ opacity: 0.9, fontSize: '1.05rem' }}>What's open right now in Vieques?</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-coral">+ Add Your Business</Link>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 22px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}>Owner Login</Link>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 24 }}>
        <MapView businesses={businesses} />

        <div style={{ margin: '24px 0 16px', overflowX: 'auto', display: 'flex', gap: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted mt-6">
            <p>No businesses yet. <Link to="/register" style={{ color: 'var(--ocean)' }}>Add yours!</Link></p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(b => <BusinessCard key={b.id} business={b} />)}
          </div>
        )}
      </div>
    </>
  );
}
