// src/services/finance.js
import { api } from './api';

// Dashboard (cartões + gráfico + recentes) – opcional, caso seu Dashboard consuma tudo de uma vez
export function getDashboard() {
  return api.request('/api/admin/dashboard', { method: 'GET' });
}

// Se seu front usa endpoints separados:
export function getAdminMetrics(params) {
  // era /admin/metrics -> no back é /api/admin/kpi-summary
  return api.request('/api/admin/kpi-summary', { method: 'GET', params });
}

export function getRevenueSeries(params) {
  // era /admin/revenue-series -> no back é /api/admin/stats/revenue-chart
  return api.request('/api/admin/stats/revenue-chart', { method: 'GET', params });
}

export function getTransactions(params) {
  // era /admin/transactions -> no back é /api/admin/orders/recent
  return api.request('/api/admin/orders/recent', { method: 'GET', params });
}

// Export CSV – só deixe se existir no back.
// Caso ainda não exista a rota, comente essa função ou trate no front.
export function exportReportCSV(params) {
  return api.request('/api/admin/reports/export', {
    method: 'GET',
    params,
    responseType: 'blob',
  });
}
