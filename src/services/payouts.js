// src/services/payouts.js
import { API_BASE_URL as API } from './api';
import { apiFetch } from './apiClient';
const ADMIN_PAYOUTS = `${API}/api/admin/payouts`;

function authHeaders() {
  const t = localStorage.getItem("adminAuthToken");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle(r) {
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = { error: txt || `HTTP ${r.status}` }; }
  if (!r.ok) throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
  return data;
}

// Lista payouts (filtros opcionais)
export async function listPayouts(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  ).toString();
  const r = await apiFetch(`${ADMIN_PAYOUTS}${qs ? `?${qs}` : ""}`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}

// Detalhe
export async function getPayout(id) {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/${id}`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}

// Processar/gerar payouts a partir de pedidos entregues
export async function processPayouts({ partner_type, cycle_type = "weekly" }) {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ partner_type, cycle_type }),
  });
  return handle(r);
}

// Marcar como pago
export async function markPayoutPaid(id, { payment_method, payment_ref, paid_at } = {}) {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/${id}/mark-paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ payment_method, payment_ref, paid_at }),
  });
  return handle(r);
}

// Modo do provedor de repasse ({ mode, auto_pay_enabled }). O front usa pra
// mostrar/ocultar o botão de pagamento automático.
export async function getPayoutProvider() {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/provider`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}

// Pagamento automático via PIX (dispara a transferência no provedor real).
// pix_key_type é opcional (CPF|CNPJ|EMAIL|PHONE|EVP) — se omitido, o backend
// infere pelo formato da chave.
export async function autoPayPayout(id, { description, pix_key_type } = {}) {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/${id}/auto-pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ description, pix_key_type }),
  });
  return handle(r);
}

// Dívidas em dinheiro dos entregadores (cash_debt > 0)
export async function listCashDebts() {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/cash-debts`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}

// Registrar acerto (entregador quitou total/parcial a dívida em dinheiro)
export async function settleCashDebt(deliveryId, { amount, note } = {}) {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/cash-debts/${deliveryId}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ amount, note }),
  });
  return handle(r);
}

// Cancelar
export async function cancelPayout(id) {
  const r = await apiFetch(`${ADMIN_PAYOUTS}/${id}/cancel`, {
    method: "POST",
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}
