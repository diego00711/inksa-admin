// src/services/api.js
// Cliente API baseado em fetch (sem dependências externas)

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  window.__API_BASE_URL__ ||
  '';

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  try {
    const raw = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (raw) headers.Authorization = `Bearer ${raw}`;
  } catch (_) {}
  return headers;
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${baseURL}${path}`, {
    method,
    credentials: 'include',
    headers: buildHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || res.statusText };
    }
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// Interface semelhante ao axios
export default {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  patch: (url, body) => request(url, { method: 'PATCH', body }),
  delete: (url) => request(url, { method: 'DELETE' }),
};
