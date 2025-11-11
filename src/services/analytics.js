import { request } from './api';

export function getMetrics({ from, to } = {}) {
  return request('/api/admin/metrics', {
    params: { from, to },
    service: 'analytics',
  });
}

export function getRevenueSeries({ from, to } = {}) {
  return request('/api/admin/revenue-series', {
    params: { from, to },
    service: 'analytics',
  });
}

export function getTransactions({ from, to, limit = 20 } = {}) {
  return request('/api/admin/transactions', {
    params: { from, to, limit },
    service: 'analytics',
  });
}
