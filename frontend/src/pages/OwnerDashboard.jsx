import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StatusSelector from '../components/StatusSelector';
import PhotoUploader from '../components/PhotoUploader';
import StatusBadge from '../components/StatusBadge';
import HoursEditor from '../components/HoursEditor';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const businessId = user?.businessId;

  const [business, setBusiness] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  const load = async () => {
    const b = await api.get(`/businesses/${businessId}`);
    setBusiness(b);
    setPhotos(b.photos || []);
    setStatus(b.status || 'Closed');
    setNote(b.note || '');
    setEditForm({ name: b.name, description: b.description || '', category: b.category || '', lat: b.lat || '', lon: b.lon || '', phone: b.phone || '' });
  };

  useEffect(() => { load(); }, [businessId]);

  const saveStatus = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.put(`/businesses/${businessId}/status`, { status, note });
      await load();
      setMsg('Status updated!');
      setTimeout(() => setMsg(''), 3000);
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
        lat: editForm.lat ? parseFloat(editForm.lat) : null,
        lon: editForm.lon ? parseFloat(editForm.lon) : null,
        phone: editForm.phone || null,
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
      (pos) => setEditForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lon: pos.coords.longitude.toFixed(6) })),
      () => alert('Could not get location.')
    );
  };

  if (!business) return <><Navbar /><div className="spinner" /></>;

  return (
    <>
      <Navbar />
      <div className="page page-narrow" style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>{business.name}</h1>
            <p className="text-sm text-muted">Code: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{/* code not stored in frontend, show blank */}●●●</strong></p>
          </div>
          <StatusBadge status={business.status} />
        </div>

        {/* Status update */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>Update Status</h2>
          <StatusSelector value={status} onChange={setStatus} />
          <div className="field">
            <label>Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Back at 2pm, fresh catch today…" rows={2} />
          </div>
          {msg && <p className={msg.startsWith('Error') ? 'text-error' : 'text-success'}>{msg}</p>}
          <button className="btn btn-primary btn-full" onClick={saveStatus} disabled={saving} style={{ padding: '14px' }}>
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>

        {/* Photos */}
        <div className="card card-body">
          <h2 style={{ marginBottom: 16 }}>Photos</h2>
          <PhotoUploader businessId={businessId} photos={photos} onUpdate={load} />
        </div>

        {/* Hours */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>Business Hours</h2>
          <HoursEditor businessId={businessId} />
        </div>

        {/* Business info */}
        <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Business Info</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(m => !m)}>
              {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {!editMode ? (
            <>
              {business.category && <p className="text-sm"><strong>Category:</strong> {business.category}</p>}
              {business.description && <p className="text-sm">{business.description}</p>}
              {business.lat && <p className="text-sm text-muted">📍 {Number(business.lat).toFixed(5)}, {Number(business.lon).toFixed(5)}</p>}
              {business.phone
                ? <p className="text-sm">📱 <strong>WhatsApp/SMS:</strong> {business.phone}</p>
                : <p className="text-sm text-muted">📱 No phone linked — add your number to update status by text</p>
              }
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">None</option>
                  {['Restaurant','Food Truck','Bar','Cafe','Shop','Service','Beach','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="field">
                <label>WhatsApp / SMS number</label>
                <input
                  type="tel"
                  placeholder="+1787XXXXXXX"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                />
                <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                  Text OPEN, CLOSED, LATE, etc. to your Abierto number to update your status instantly.
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={getLocation}>📍 Use Current Location</button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field"><label>Lat</label><input type="number" step="any" value={editForm.lat} onChange={e => setEditForm(f => ({ ...f, lat: e.target.value }))} /></div>
                <div className="field"><label>Lon</label><input type="number" step="any" value={editForm.lon} onChange={e => setEditForm(f => ({ ...f, lon: e.target.value }))} /></div>
              </div>
              <button className="btn btn-primary" onClick={saveInfo} disabled={savingInfo}>
                {savingInfo ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
