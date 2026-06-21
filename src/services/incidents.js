// src/services/incidents.js
import { API_BASE_URL as API } from './api';
import { apiFetch } from './apiClient';

const BASE = `${API}/api/admin/incidents`;

function authHeaders() {
  const t = localStorage.getItem('adminAuthToken');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle(r) {
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = { error: txt || `HTTP ${r.status}` }; }
  if (!r.ok) throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
  return data;
}

export async function listIncidents(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  const r = await apiFetch(`${BASE}${qs ? `?${qs}` : ''}`, {
    headers: { ...authHeaders() },
    credentials: 'include',
  });
  const data = await handle(r);
  return data?.data || [];
}

export async function resolveIncident(id, resolution, note = '') {
  const r = await apiFetch(`${BASE}/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ resolution, note }),
  });
  return handle(r);
}

// Processa o reembolso ao cliente (Mercado Pago)
export async function refundIncident(id) {
  const r = await apiFetch(`${BASE}/${id}/refund`, {
    method: 'POST',
    headers: { ...authHeaders() },
    credentials: 'include',
  });
  return handle(r);
}
