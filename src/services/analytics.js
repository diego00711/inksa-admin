// src/services/analytics.js
// use default import + extensão .js para evitar erro de resolução no Vite/Linux
import api from './api.js';
// Se o seu src/services/api.js exportar "api" nomeado em vez de default, troque a linha acima por:
// import { api } from './api.js';

/** GET /api/analytics/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function getMetrics({ from, to }) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const { data } = await api.get(`/api/analytics/metrics?${q.toString()}`);
  return data;
}

/** GET /api/analytics/revenue-series?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function getRevenueSeries({ from, to }) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const { data } = await api.get(`/api/analytics/revenue-series?${q.toString()}`);
  return data;
}

/** GET /api/analytics/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=20 */
export async function getTransactions({ from, to, limit = 20 }) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (limit) q.set('limit', String(limit));
  const { data } = await api.get(`/api/analytics/transactions?${q.toString()}`);
  return data;
}
