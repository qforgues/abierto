import React, { useRef } from 'react';
import { api, uploadUrl } from '../api/client';

export default function PhotoUploader({ businessId, photos, onUpdate }) {
  const inputRef = useRef();

  const handleAdd = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await api.uploadPhoto(businessId, file);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  };

  const handleDelete = async (photoId) => {
    if (!confirm('Remove this photo?')) return;
    try {
      await api.delete(`/businesses/${businessId}/photos/${photoId}`);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetMain = async (photoId) => {
    try {
      await api.patch(`/businesses/${businessId}/photos/${photoId}/main`);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  // photos are already sorted by sort_order ASC from the backend
  const [main, ...others] = photos;
  while (others.length < 3) others.push(null);

  const btnBase = {
    position: 'absolute',
    border: 'none',
    borderRadius: '50%',
    width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.85rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Card icon / main photo slot */}
      <div style={{ position: 'relative' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mid)', marginBottom: 6 }}>
          ★ Card Photo (shown in list)
        </p>
        <div
          className="photo-slot"
          style={{ aspectRatio: '16/9', borderRadius: 12, cursor: main ? 'default' : 'pointer' }}
          onClick={() => !main && inputRef.current.click()}
        >
          {main ? (
            <>
              <img
                src={uploadUrl(main.filename)}
                alt="Card photo"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <button
                style={{ ...btnBase, top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white' }}
                onClick={(e) => { e.stopPropagation(); handleDelete(main.id); }}
              >✕</button>
            </>
          ) : (
            <span className="add-icon">+</span>
          )}
        </div>
      </div>

      {/* Extra photo slots (3) */}
      <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mid)', marginBottom: 2 }}>
        Extra Photos
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {others.map((photo, i) => (
          <div
            key={photo ? photo.id : `empty-${i}`}
            className="photo-slot"
            style={{ borderRadius: 10, cursor: photo ? 'default' : 'pointer' }}
            onClick={() => !photo && inputRef.current.click()}
          >
            {photo ? (
              <>
                <img
                  src={uploadUrl(photo.filename)}
                  alt="Business photo"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                <button
                  title="Set as card photo"
                  style={{ ...btnBase, top: 4, left: 4, background: 'rgba(0,0,0,0.55)', color: '#facc15', width: 24, height: 24, fontSize: '0.75rem' }}
                  onClick={(e) => { e.stopPropagation(); handleSetMain(photo.id); }}
                >★</button>
                <button
                  style={{ ...btnBase, top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: 'white', width: 24, height: 24, fontSize: '0.75rem' }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                >✕</button>
              </>
            ) : (
              <span className="add-icon">+</span>
            )}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleAdd}
      />
    </div>
  );
}
