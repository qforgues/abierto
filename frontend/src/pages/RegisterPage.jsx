import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';

const CATEGORIES = ['Restaurant', 'Food Truck', 'Bar', 'Cafe', 'Shop', 'Service', 'Beach', 'Other'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', description: '', category: '', lat: '', lon: '' });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();
  const r = t.register;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('lat', pos.coords.latitude.toFixed(6));
        set('lon', pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { alert(r.errLocation); setLocating(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(r.errName);
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
        <h1 style={{ marginBottom: 4 }}>{r.title}</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>{r.subtitle}</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>{r.sectionInfo}</h2>
            <div className="field">
              <label>{r.labelName} *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder={r.placeholderName} autoFocus />
            </div>
            <div className="field">
              <label>{r.labelCategory}</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">{r.placeholderCategory}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{t.categories[c]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{r.labelDescription}</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder={r.placeholderDescription} rows={3} />
            </div>
          </div>

          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>{r.sectionLocation}</h2>
            <p className="text-sm text-muted">{r.locationHint}</p>
            <button type="button" className="btn btn-ghost" onClick={getLocation} disabled={locating}>
              {locating ? r.btnLocating : r.btnLocate}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>{r.labelLat}</label>
                <input type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="18.1234" />
              </div>
              <div className="field">
                <label>{r.labelLon}</label>
                <input type="number" step="any" value={form.lon} onChange={e => set('lon', e.target.value)} placeholder="-65.4321" />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '16px' }}>
            {loading ? r.btnSubmitting : r.btnSubmit}
          </button>
        </form>
      </div>
    </>
  );
}
