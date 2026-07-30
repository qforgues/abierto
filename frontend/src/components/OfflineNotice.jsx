import React, { useEffect, useState } from 'react';
import { onFreshnessChange } from '../api/client';
import { useLang } from '../context/LangContext';

/**
 * Tells people, unmissably, when they're looking at cached data and how old it is.
 *
 * Abierto's entire promise is "open RIGHT NOW". The service worker will serve cached
 * business data when the network fails — which is the difference between a usable app and a
 * blank screen on Vieques' patchy signal — but a cached "Open" for a place that shut an hour
 * ago sends someone across the island for nothing. So the moment anything on screen came
 * from cache, we say so and name the age. Never let stale data pass as live.
 */
export default function OfflineNotice() {
  const { lang } = useLang();
  const [{ fromCache, cachedAt }, setState] = useState({ fromCache: false, cachedAt: null });
  // Re-render every 30s so "3 minutes ago" doesn't sit there getting quietly wrong.
  const [, tick] = useState(0);

  useEffect(() => onFreshnessChange(setState), []);
  useEffect(() => {
    if (!fromCache) return;
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [fromCache]);

  if (!fromCache) return null;

  const es = lang === 'es';
  const age = (() => {
    if (!cachedAt) return null;
    const mins = Math.max(0, Math.round((Date.now() - new Date(cachedAt).getTime()) / 60000));
    if (mins < 1) return es ? 'hace menos de un minuto' : 'less than a minute ago';
    if (mins < 60) return es ? `hace ${mins} min` : `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return es ? `hace ${hrs} h` : `${hrs} h ago`;
    const days = Math.round(hrs / 24);
    return es ? `hace ${days} día${days === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'} ago`;
  })();

  return (
    <div
      role="status"
      style={{
        background: '#fef3c7',
        borderBottom: '1px solid #fcd34d',
        color: '#78350f',
        padding: '9px 14px',
        fontSize: '0.84rem',
        lineHeight: 1.45,
        textAlign: 'center',
      }}
    >
      <strong>{es ? 'Sin conexión' : "You're offline"}</strong>
      {' — '}
      {es
        ? `esto es lo último que guardamos${age ? ` (${age})` : ''}. Los horarios pueden haber cambiado.`
        : `showing the last saved information${age ? ` (${age})` : ''}. Open/closed status may have changed since.`}
    </div>
  );
}
