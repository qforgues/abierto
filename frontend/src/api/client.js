const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE = RAW_API_BASE.replace(/\/+$/, '');
const UPLOADS_BASE = BASE.endsWith('/api') ? `${BASE.slice(0, -4)}/uploads` : `${BASE}/uploads`;

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const body = options.body;
  if (body != null && !isFormData(body) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const text = await res.text();
  const data = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  })() : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  uploadPhoto: async (businessId, file) => {
    const form = new FormData();
    form.append('photo', file);
    const res = await fetch(`${BASE}/businesses/${businessId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const text = await res.text();
    const data = text ? (() => {
      try {
        return JSON.parse(text);
      } catch {
        return { error: text };
      }
    })() : {};
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
};

export function uploadUrl(filename) {
  if (!filename) return '';
  return `${UPLOADS_BASE}/${filename}`;
}
