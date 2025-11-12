// src/services/evaluations.js
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

function getToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function request(path, { method = 'GET', params, body } = {}) {
  const token = getToken();
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  const text = await response.text();
  let payload = {};
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { message: text }; }
  }

  if (!response.ok) {
    const message = payload.message || payload.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload.data ?? payload;
}

/* --- Avaliações (mantém /api/admin/...) --- */
export function fetchEvaluationSummary(params = {}) {
  return request('/api/admin/evaluations/summary', { params });
}

export function fetchEvaluations(params = {}) {
  return request('/api/admin/evaluations', { params });
}

/* --- Gamificação (corrigido p/ /api/gamification/...) --- */
export function fetchGamificationOverview(params = {}) {
  return request('/api/gamification/overview', { params });
}

export function fetchGamificationLeaderboard(params = {}) {
  return request('/api/gamification/leaderboard', { params });
}

export function triggerGamificationRecalculation(params = {}) {
  return request('/api/gamification/recalculate', {
    method: 'POST',
    body: params,
  });
}
