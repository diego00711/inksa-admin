// src/services/finance.js
// API base com fallback para variáveis antigas
const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getAuthToken() {
  try {
    // tente ambas as chaves (alguns pontos do app usam "admin_token")
    return (
      localStorage.getItem('auth_token') ||
      localStorage.getItem('admin_token') ||
      ''
    );
  } catch {
    return '';
  }
}

async function request(path, { method = 'GET', params, body, responseType = 'json' } = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL (ou VITE_API_URL) não configurado. Defina no .env.local');
  }

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    // tenta extrair mensagem útil
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`API ${method} ${path} falhou (${res.status})${detail ? `: ${detail}` : ''}`);
  }

  if (responseType === 'blob') return res.blob();

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// Endpoints usados no Admin
export const financeApi = {
  // seu dashboard consolidado no backend está em /api/admin/dashboard
  getDashboard: () => request('/api/admin/dashboard'),

  // séries/relatórios (ajuste se seus endpoints forem diferentes)
  getRevenueSeries: (params) => request('/api/admin/revenue-series', { params }),
  getTransactions: (params) => request('/api/admin/transactions', { params }),
  exportReportCSV: (params) =>
    request('/api/admin/reports/export', { params, responseType: 'blob' }),
};

// também exporta default para suportar "import financeApi from ...;"
export default financeApi;
