import React, { useRef } from 'react';
import { api } from '../api/client';

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

  const slots = [...photos];
  while (slots.length < 3) slots.push(null);

  return (
    <div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Photos (up to 3)</label>
      </div>
      <div className="photo-grid">
        {slots.map((photo, i) => (
          <div
            key={photo ? photo.id : `empty-${i}`}
            className="photo-slot"
            onClick={() => !photo && inputRef.current.click()}
          >
            {photo ? (
              <>
                <img src={`/uploads/${photo.filename}`} alt="Business photo" />
                <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}>✕</button>
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
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleAdd}
      />
    </div>
  );
}
