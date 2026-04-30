// src/services/evaluations.js
import { API_BASE_URL } from './api';

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

function toApiParams(params = {}) {
  return {
    partner_type: params.scope,
    start_date: params.from,
    end_date: params.to,
  };
}

// GET /api/admin/gamification (métricas) + /api/admin/gamification/rating-distribution
// merged into a single object so normalizeSummary works without changes in the page.
export async function fetchEvaluationSummary(params = {}) {
  const apiParams = toApiParams(params);
  const [metrics, distData] = await Promise.all([
    request('/api/admin/gamification', { params: apiParams }),
    request('/api/admin/gamification/rating-distribution', { params: apiParams }).catch(() => ({})),
  ]);

  // Convert [{rating, count}] → {1: n, 2: n, …}
  const distribution = {};
  (distData?.distribution ?? []).forEach(({ rating, count }) => {
    distribution[rating] = count;
  });

  // The API returns response_rate as a percentage (e.g. 85.5).
  // The page displays Math.round(summary.responseRate * 100)%, so store as decimal (0–1).
  const rr = metrics?.response_rate ?? metrics?.responseRate;
  const responseRate = rr != null ? rr / 100 : null;

  return { ...metrics, response_rate: responseRate, distribution };
}

// GET /api/admin/gamification/reviews
export function fetchEvaluations(params = {}) {
  return request('/api/admin/gamification/reviews', {
    params: {
      limit: params.limit ?? 10,
      ...toApiParams(params),
    },
  });
}

// GET /api/admin/gamification (overview/gamification sidebar)
export function fetchGamificationOverview(params = {}) {
  return request('/api/admin/gamification', { params: toApiParams(params) });
}

// GET /api/admin/gamification/leaderboard
export function fetchGamificationLeaderboard(params = {}) {
  return request('/api/admin/gamification/leaderboard', {
    params: {
      scope: params.scope,
      limit: params.limit ?? 10,
    },
  });
}

export function triggerGamificationRecalculation(params = {}) {
  return request('/api/gamification/recalculate', {
    method: 'POST',
    body: params,
  });
}
