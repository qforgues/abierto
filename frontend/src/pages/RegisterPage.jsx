import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HoursEditor from '../components/HoursEditor';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';
import { CATEGORY_ICONS } from '../constants/categories';

const CATEGORIES = ['Attraction', 'Bar', 'Beach', 'Cafe', 'Food Truck', 'Other', 'Park', 'Restaurant', 'Service', 'Shop', 'Transportation'];

function blankWeek() {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    open_time: '09:00',
    close_time: '21:00',
    is_closed: i === 0,
  }));
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', description: '', category: '', phone: '', lat: '', lon: '' });
  const [showHours, setShowHours] = useState(false);
  const [hours, setHours] = useState(blankWeek());
  const [locating, setLocating] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();
  const r = t.register;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const getLocation = () => {
    setLocating(true);
    setLocDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('lat', pos.coords.latitude.toFixed(6).split('.')[1]);
        set('lon', pos.coords.longitude.toFixed(6).split('.')[1]);
        setLocating(false);
      },
      (err) => {
        if (err.code === 1) {
          setLocDenied(true);
        } else {
          setError(r.errLocation);
        }
        setLocating(false);
      }
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
        phone: form.phone ? `+1${form.phone.replace(/\D/g, '')}` : null,
        lat: form.lat ? parseFloat('18.' + form.lat) : null,
        lon: form.lon ? parseFloat('-65.' + form.lon) : null,
        hours: showHours ? hours : undefined,
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

        <div style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 4 }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 5, color: 'var(--ocean)' }}>{r.accuracyTitle}</p>
          <p className="text-sm" style={{ lineHeight: 1.65, color: 'var(--mid)', margin: 0 }}>{r.accuracyBody}</p>
        </div>

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
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {t.categories[c]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{r.labelDescription}</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder={r.placeholderDescription} rows={3} />
            </div>
            <div className="field">
              <label>{r.labelPhone} <span className="text-muted" style={{ fontWeight: 400 }}>{r.phoneOptional}</span></label>
              <input type="text" inputMode="numeric" value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder={r.placeholderPhone} />
            </div>
          </div>

          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>{r.sectionLocation}</h2>
            <p className="text-sm text-muted">{r.locationHint}</p>
            <button type="button" className="btn btn-ghost" onClick={getLocation} disabled={locating}>
              {locating ? r.btnLocating : r.btnLocate}
            </button>
            {locDenied && (
              <div className="alert alert-error" style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong>{r.errLocationDenied}</strong>
                <span>{r.errLocationDeniedHint}</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={getLocation}>
                  {r.btnTryAgain}
                </button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>{r.labelLat}</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
                  <span style={{ padding: '0 10px', color: 'var(--mid)', fontWeight: 600, fontSize: '0.95rem', borderRight: '1px solid var(--border)', background: 'var(--light)', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>18.</span>
                  <input type="number" step="any" min="0" max="999999" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="12345" style={{ border: 'none', flex: 1, padding: '10px 10px', outline: 'none', fontSize: '0.95rem', background: 'transparent' }} />
                </div>
              </div>
              <div className="field">
                <label>{r.labelLon}</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
                  <span style={{ padding: '0 10px', color: 'var(--mid)', fontWeight: 600, fontSize: '0.95rem', borderRight: '1px solid var(--border)', background: 'var(--light)', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>-65.</span>
                  <input type="number" step="any" min="0" max="999999" value={form.lon} onChange={e => set('lon', e.target.value)} placeholder="43210" style={{ border: 'none', flex: 1, padding: '10px 10px', outline: 'none', fontSize: '0.95rem', background: 'transparent' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0 }}>{r.sectionHours}</h2>
                <p className="text-sm text-muted" style={{ margin: '4px 0 0' }}>{r.hoursOptional}</p>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${showHours ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setShowHours(v => !v)}
              >
                {showHours ? r.hoursHide : r.hoursAdd}
              </button>
            </div>
            {showHours && (
              <HoursEditor value={hours} onChange={setHours} />
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '16px' }}>
            {loading ? r.btnSubmitting : r.btnSubmit}
          </button>
        </form>
      </div>
    </>
  );
}
