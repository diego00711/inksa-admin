// src/services/analytics.js
// -> Versão sem axios, usando fetch e endpoints /api/admin/*

import { API_BASE_URL } from './api';
import { apiFetch } from './apiClient';

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
  const res = await apiFetch(`${API_BASE_URL}${pathWithQuery}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (res.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return body.data ?? body;
}

/**
 * Dashboard inteiro numa chamada. Substitui getMetrics + getRevenueSeries +
 * getTransactions, que rodavam o MESMO conjunto de queries três vezes por
 * carregamento. As três continuam exportadas pra quem ainda usa.
 */
export async function getOverview({ from, to, limit = 20 } = {}) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (limit) q.set('limit', String(limit));
  const qs = q.toString();
  return getJson(`/api/admin/overview${qs ? `?${qs}` : ''}`);
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
