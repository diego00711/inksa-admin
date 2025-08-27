const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

async function request(path, { method = 'GET', params, body, responseType = 'json' } = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL não configurado. Defina no .env.local');
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
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} falhou (${res.status}): ${text}`);
  }

  if (responseType === 'blob') return res.blob();

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const financeApi = {
  getAdminMetrics: (params) => request('/admin/metrics', { params }),
  getRevenueSeries: (params) => request('/admin/revenue-series', { params }),
  getTransactions: (params) => request('/admin/transactions', { params }),
  exportReportCSV: (params) => request('/admin/reports/export', { params, responseType: 'blob' }),
};
