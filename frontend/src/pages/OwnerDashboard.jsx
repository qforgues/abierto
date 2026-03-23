import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StatusSelector from '../components/StatusSelector';
import PhotoUploader from '../components/PhotoUploader';
import StatusBadge from '../components/StatusBadge';
import HoursEditor from '../components/HoursEditor';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const ow = t.owner;
  const businessId = user?.businessId;

  const [business, setBusiness] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [hasHours, setHasHours] = useState(false);
  const [status, setStatus] = useState('Closed');
  const [note, setNote] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  const load = async () => {
    const [b, hours] = await Promise.all([
      api.get(`/businesses/${businessId}`),
      api.get(`/businesses/${businessId}/hours`),
    ]);
    setBusiness(b);
    setPhotos(b.photos || []);
    setHasHours(hours.length > 0);
    const stored = await api.get(`/businesses/${businessId}/status`);
    setStatus(stored.status || 'Closed');
    setNote(stored.note || '');
    setReturnTime(stored.return_time || '');
    setReturnDate(stored.return_date || '');
    setEditForm({
      name: b.name, description: b.description || '', category: b.category || '',
      lat: b.lat ? String(b.lat).split('.')[1] || '' : '',
      lon: b.lon ? String(b.lon).split('.')[1] || '' : '',
      phone: (() => {
        const d = (b.phone || '').replace(/\D/g, '').slice(-10);
        if (!d) return '';
        if (d.length > 6) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
        if (d.length > 3) return `(${d.slice(0,3)}) ${d.slice(3)}`;
        return d;
      })(),
    });
  };

  useEffect(() => { load(); }, [businessId]);

  const saveStatus = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.put(`/businesses/${businessId}/status`, {
        status,
        note: ['Out to Lunch', 'Closed for the Season'].includes(status) ? undefined : note,
        return_time: returnTime || undefined,
        return_date: returnDate || undefined,
      });
      setMsg(ow.statusUpdated);
      setTimeout(() => setMsg(''), 3000);
      const b = await api.get(`/businesses/${businessId}`);
      setBusiness(b);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      await api.patch(`/businesses/${businessId}`, {
        name: editForm.name,
        description: editForm.description || null,
        category: editForm.category || null,
        lat: editForm.lat ? parseFloat('18.' + editForm.lat) : null,
        lon: editForm.lon ? parseFloat('-65.' + editForm.lon) : null,
        phone: editForm.phone ? `+1${editForm.phone.replace(/\D/g, '')}` : null,
      });
      await load();
      setEditMode(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setEditForm(f => ({
        ...f,
        lat: pos.coords.latitude.toFixed(6).split('.')[1],
        lon: pos.coords.longitude.toFixed(6).split('.')[1],
      })),
      (err) => {
        if (err.code === 1) {
          alert('Location access is blocked. Please enable it in your browser or device settings, then try again.');
        } else {
          alert('Could not get location.');
        }
      }
    );
  };

  if (!business) return <><Navbar /><div className="spinner" /></>;

  const showNote = !['Out to Lunch', 'Closed for the Season'].includes(status);

  return (
    <>
      <Navbar />
      <div className="page page-narrow" style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>{business.name}</h1>
            <p className="text-sm text-muted">Code: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>●●●</strong></p>
          </div>
          <StatusBadge status={business.status} />
        </div>

        {/* Status update */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>{ow.updateStatusTitle}</h2>
          <StatusSelector
            value={status}
            onChange={setStatus}
            returnTime={returnTime}
            onReturnTimeChange={setReturnTime}
            returnDate={returnDate}
            onReturnDateChange={setReturnDate}
            hasHours={hasHours}
          />
          {showNote && (
            <div className="field">
              <label>{ow.noteLabel} <span className="text-muted" style={{ fontWeight: 400 }}>{ow.noteOptional}</span></label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={ow.notePlaceholder}
                rows={2}
              />
            </div>
          )}
          {msg && <p className={msg.startsWith('Error') ? 'text-error' : 'text-success'}>{msg}</p>}
          <button className="btn btn-primary btn-full" onClick={saveStatus} disabled={saving} style={{ padding: '14px' }}>
            {saving ? ow.saving : ow.updateBtn}
          </button>
        </div>

        {/* Photos */}
        <div className="card card-body">
          <h2 style={{ marginBottom: 16 }}>{ow.photosTitle}</h2>
          <PhotoUploader businessId={businessId} photos={photos} onUpdate={load} />
        </div>

        {/* Hours */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>{ow.hoursTitle}</h2>
          <p className="text-sm text-muted">{ow.hoursHint}</p>
          <HoursEditor businessId={businessId} onSaved={() => load()} />
        </div>

        {/* Business info */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{ow.infoTitle}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(m => !m)}>
              {editMode ? ow.cancel : ow.edit}
            </button>
          </div>

          {!editMode ? (
            <>
              {business.category && <p className="text-sm"><strong>{ow.categoryLabel}:</strong> {business.category}</p>}
              {business.description && <p className="text-sm">{business.description}</p>}
              {business.lat && <p className="text-sm text-muted">📍 {Number(business.lat).toFixed(5)}, {Number(business.lon).toFixed(5)}</p>}
              {business.phone
                ? <p className="text-sm">📱 <strong>WhatsApp/SMS:</strong> {business.phone}</p>
                : <p className="text-sm text-muted">📱 {ow.noPhone}</p>
              }
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>{ow.nameLabel}</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>{ow.categoryLabel}</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">None</option>
                  {['Restaurant','Food Truck','Bar','Cafe','Shop','Service','Beach','Park','Attraction','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>{ow.descLabel}</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="field">
                <label>{ow.phoneLabel}</label>
                <input type="text" inputMode="numeric" placeholder="(787) 000-0000" value={editForm.phone} onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  let fmt = digits;
                  if (digits.length > 6) fmt = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
                  else if (digits.length > 3) fmt = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
                  setEditForm(f => ({ ...f, phone: fmt }));
                }} />
                <p className="text-sm text-muted" style={{ marginTop: 4 }}>{ow.phoneHint}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={getLocation}>{ow.useLocation}</button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Lat</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
                    <span style={{ padding: '0 10px', color: 'var(--mid)', fontWeight: 600, fontSize: '0.95rem', borderRight: '1px solid var(--border)', background: 'var(--light)', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>18.</span>
                    <input type="number" step="any" min="0" max="999999" value={editForm.lat} onChange={e => setEditForm(f => ({ ...f, lat: e.target.value }))} style={{ border: 'none', flex: 1, padding: '10px 10px', outline: 'none', fontSize: '0.95rem', background: 'transparent' }} />
                  </div>
                </div>
                <div className="field">
                  <label>Lon</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
                    <span style={{ padding: '0 10px', color: 'var(--mid)', fontWeight: 600, fontSize: '0.95rem', borderRight: '1px solid var(--border)', background: 'var(--light)', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>-65.</span>
                    <input type="number" step="any" min="0" max="999999" value={editForm.lon} onChange={e => setEditForm(f => ({ ...f, lon: e.target.value }))} style={{ border: 'none', flex: 1, padding: '10px 10px', outline: 'none', fontSize: '0.95rem', background: 'transparent' }} />
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveInfo} disabled={savingInfo}>
                {savingInfo ? ow.saving : ow.saveChanges}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
