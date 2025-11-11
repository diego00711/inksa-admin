import { request } from './api';

const METRICS_PATHS = [
  '/api/admin/finance/metrics',
  '/api/admin/metrics',
  '/admin/finance/metrics',
  '/admin/metrics',
];

const REVENUE_SERIES_PATHS = [
  '/api/admin/finance/revenue-series',
  '/api/admin/revenue-series',
  '/admin/finance/revenue-series',
  '/admin/revenue-series',
];

const TRANSACTIONS_PATHS = [
  '/api/admin/finance/transactions',
  '/api/admin/transactions',
  '/admin/finance/transactions',
  '/admin/transactions',
];

const EXPORT_PATHS = [
  '/api/admin/finance/reports/export',
  '/api/admin/reports/export',
  '/admin/finance/reports/export',
  '/admin/reports/export',
];

function shouldBubble(error) {
  return Boolean(error?.message && error.message.includes('Sessão expirada'));
}

function unwrapCollection(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.transactions)) return payload.transactions;
  if (Array.isArray(payload.rows)) return payload.rows;
  return [];
}

async function requestFirst(paths, options) {
  let lastError = null;

  for (const path of paths) {
    try {
      return await request(path, options);
    } catch (error) {
      if (shouldBubble(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Nenhum endpoint disponível para a operação financeira.');
}

export const financeApi = {
  async getAdminMetrics(params = {}) {
    const result = await requestFirst(METRICS_PATHS, { params });
    return result && typeof result === 'object' ? result : {};
  },

  async getRevenueSeries(params = {}) {
    const result = await requestFirst(REVENUE_SERIES_PATHS, { params });
    return unwrapCollection(result);
  },

  async getTransactions(params = {}) {
    const result = await requestFirst(TRANSACTIONS_PATHS, { params });
    const items = unwrapCollection(result);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const { total, count, pagination, meta } = result;
      return {
        items,
        total: typeof total === 'number' ? total : typeof count === 'number' ? count : items.length,
        pagination: pagination || meta || null,
      };
    }
    return { items, total: items.length, pagination: null };
  },

  async exportReportCSV(params = {}) {
    let lastError = null;

    for (const path of EXPORT_PATHS) {
      try {
        const response = await request(path, { params, raw: true });
        if (!response.ok) {
          const message = await response.text().catch(() => '');
          lastError = new Error(message || `Falha ao exportar relatório (${response.status}).`);
          continue;
        }
        return await response.blob();
      } catch (error) {
        if (shouldBubble(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Não foi possível exportar o relatório financeiro.');
  },
};
