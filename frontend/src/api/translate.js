// Auto-translates text via the Cloud Translation API when a stored translation
// isn't available. Read-only, cached per session, fails silent (falls back to the
// original text). Params are passed in the query string to keep it a simple CORS
// request (no preflight).
import { useState, useEffect } from 'react';
import { api } from './client';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const cache = {}; // `${target}:${text}` -> translated text
const persisted = new Set(); // business ids we've already sent a translation for this session

export async function translateText(text, target = 'es', source = 'en') {
  if (!text || !KEY) return text;
  const ck = `${target}:${text}`;
  if (ck in cache) return cache[ck];
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${KEY}`
      + `&q=${encodeURIComponent(text)}&target=${target}&source=${source}&format=text`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) { cache[ck] = text; return text; }
    const data = await res.json();
    const out = data?.data?.translations?.[0]?.translatedText || text;
    cache[ck] = out;
    return out;
  } catch {
    cache[ck] = text;
    return text;
  }
}

// Best display text: stored translation if present, else an auto-translation
// (only in Spanish mode), else the original English. When a businessId is given,
// a fresh auto-translation is persisted to the DB (description_es) so it's only
// ever generated once — subsequent loads get the stored copy.
export function useAutoTranslated(original, stored, lang, businessId) {
  const [text, setText] = useState(stored || original || '');
  useEffect(() => {
    if (lang !== 'es') { setText(original || ''); return; }
    if (stored) { setText(stored); return; }       // prefer a stored/human translation
    if (!original) { setText(''); return; }
    let alive = true;
    setText(original);                             // show English while translating
    translateText(original, 'es').then(t => {
      if (alive) setText(t);
      // Cache it in the DB (once per business per session, only a real translation).
      if (businessId && t && t !== original && !persisted.has(businessId)) {
        persisted.add(businessId);
        api.post(`/businesses/${businessId}/translation`, { description: original, description_es: t })
          .catch(() => persisted.delete(businessId));
      }
    });
    return () => { alive = false; };
  }, [original, stored, lang, businessId]);
  return text;
}
