// src/services/analytics.js
// -> Versão sem axios, usando fetch e endpoints /api/admin/*

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

function authHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getJson(pathWithQuery) {
  const res = await fetch(`${API_BASE_URL}${pathWithQuery}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (res.status === 401) {
    // token inválido/ausente: limpa e volta ao login
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  // muitos dos nossos endpoints retornam { status, data }
  return body.data ?? body;
}

export async function getMetrics({ from, to } = {}) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return getJson(`/api/admin/metrics${qs ? `?${qs}` : ''}`);
}

export async function getRevenueSeries({ from, to } = {}) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return getJson(`/api/admin/revenue-series${qs ? `?${qs}` : ''}`);
}

export async function getTransactions({ from, to, limit = 20 } = {}) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (limit) q.set('limit', String(limit));
  const qs = q.toString();
  return getJson(`/api/admin/transactions${qs ? `?${qs}` : ''}`);
}
