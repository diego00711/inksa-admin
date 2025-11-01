// src/services/api.js
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
// Ex.: VITE_API_BASE_URL=https://inksa-auth-flask-dev.onrender.com

function getAdminToken() {
  try {
    // preferimos admin_token; fallback para auth_token
    return (
      localStorage.getItem('admin_token') ||
      localStorage.getItem('auth_token') ||
      ''
    );
  } catch {
    return '';
  }
}

export async function apiRequest(path, { method = 'GET', params, body, headers } = {}) {
  if (!RAW_BASE) throw new Error('VITE_API_BASE_URL não configurado');

  // Garante prefixo /api
  const normalizedPath = path.startsWith('/api') ? path : `/api${path}`;

  const url = new URL(`${RAW_BASE}${normalizedPath}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const token = getAdminToken();
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const ct = res.headers.get('content-type') || '';
  const parse = async () => (ct.includes('application/json') ? await res.json() : await res.text());

  if (!res.ok) {
    const payload = await parse().catch(() => ({}));
    const msg = (payload && (payload.error || payload.message)) || `HTTP error! status: ${res.status}`;
    throw new Error(msg);
  }
  return parse();
}
