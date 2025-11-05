// src/services/analytics.js
import { api } from './api';

/**
 * Métricas agregadas do dashboard
 * GET /api/analytics/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getMetrics({ from, to }) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const { data } = await api.get(`/api/analytics/metrics?${params.toString()}`);
  return data;
}

/**
 * Série temporal de receita
 * GET /api/analytics/revenue-series?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getRevenueSeries({ from, to }) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const { data } = await api.get(`/api/analytics/revenue-series?${params.toString()}`);
  return data;
}

/**
 * Últimas transações
 * GET /api/analytics/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=20
 */
export async function getTransactions({ from, to, limit = 20 }) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (limit) params.set('limit', String(limit));

  const { data } = await api.get(`/api/analytics/transactions?${params.toString()}`);
  return data;
}
