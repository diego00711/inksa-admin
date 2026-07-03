// src/utils/adminFormat.js
// Helpers compartilhados entre EvaluationsPage e GamificationPage
// (ambas nasceram de uma unica pagina EvaluationsGamificationPage.jsx).

export const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
];

export const SCOPE_OPTIONS = [
  { value: 'restaurant', label: 'Restaurantes' },
  { value: 'delivery', label: 'Entregadores' },
];

const PERIOD_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function buildRange(period) {
  const today = new Date();
  const days = PERIOD_DAYS[period] ?? 30;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));

  const toDate = today.toISOString().slice(0, 10);
  const fromDate = from.toISOString().slice(0, 10);

  return {
    period,
    from: fromDate,
    to: toDate,
  };
}

export function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

export function formatNumber(value, { decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
