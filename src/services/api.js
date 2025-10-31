// src/services/api.js
// Base do back (igual ao que você usa no restante do admin)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// tenta várias chaves de token (compatível com AuthContext/localStorage)
function getAuthToken() {
  try {
    return (
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      ''
    );
  } catch {
    return '';
  }
}

async function request(path, { method = 'GET', params, body, responseType = 'json' } = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_URL não configurado. Defina no .env.local do admin.');
  }

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // tenta extrair mensagem do back
    const txt = await res.text().catch(() => '');
    let msg = txt;
    try {
      const j = JSON.parse(txt);
      msg = j?.message || j?.error || txt;
    } catch {}
    throw new Error(`API ${method} ${path} falhou (${res.status}): ${msg}`);
  }

  if (responseType === 'blob') return res.blob();

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const api = { request };
