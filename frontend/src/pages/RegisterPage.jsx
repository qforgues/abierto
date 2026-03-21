import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';

const CATEGORIES = ['Restaurant', 'Food Truck', 'Bar', 'Cafe', 'Shop', 'Service', 'Beach', 'Other'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', description: '', category: '', lat: '', lon: '' });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('lat', pos.coords.latitude.toFixed(6));
        set('lon', pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { alert('Could not get location. Enter manually.'); setLocating(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Business name is required.');
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/businesses/register', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lon: form.lon ? parseFloat(form.lon) : null,
      });
      navigate('/register/success', { state: { code: data.code, businessId: data.business.id, name: data.business.name } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page page-narrow" style={{ paddingTop: 32 }}>
        <h1 style={{ marginBottom: 4 }}>Add Your Business</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>Get listed on Abierto and let Vieques know when you're open.</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>Business Info</h2>
            <div className="field">
              <label>Business Name *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Playa Snacks" autoFocus />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select a category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell customers what you offer…" rows={3} />
            </div>
          </div>

          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>Location</h2>
            <p className="text-sm text-muted">Used to pin your business on the map. Great for food trucks and mobile stands.</p>
            <button type="button" className="btn btn-ghost" onClick={getLocation} disabled={locating}>
              {locating ? 'Getting location…' : '📍 Use My Current Location'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Latitude</label>
                <input type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="18.1234" />
              </div>
              <div className="field">
                <label>Longitude</label>
                <input type="number" step="any" value={form.lon} onChange={e => set('lon', e.target.value)} placeholder="-65.4321" />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '16px' }}>
            {loading ? 'Registering…' : 'Register Business →'}
          </button>
        </form>
      </div>
    </>
  );
}
