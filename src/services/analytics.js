// src/services/analytics.js
import api from './api.js';

export async function getMetrics({ from, to }) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const { data } = await api.get(`/api/analytics/metrics?${q.toString()}`);
  return data;
}

export async function getRevenueSeries({ from, to }) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const { data } = await api.get(`/api/analytics/revenue-series?${q.toString()}`);
  return data;
}

export async function getTransactions({ from, to, limit = 20 }) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (limit) q.set('limit', String(limit));
  const { data } = await api.get(`/api/analytics/transactions?${q.toString()}`);
  return data;
}
