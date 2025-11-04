// src/services/payouts.js
const API = import.meta.env.VITE_API_URL; // ex: https://inksa-auth-flask-dev.onrender.com
const ADMIN_PAYOUTS = `${API}/api/admin/payouts`;

function authHeaders() {
  const t = localStorage.getItem("access_token");
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
  const r = await fetch(`${ADMIN_PAYOUTS}${qs ? `?${qs}` : ""}`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}

// Detalhe
export async function getPayout(id) {
  const r = await fetch(`${ADMIN_PAYOUTS}/${id}`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}

// Processar/gerar payouts a partir de pedidos entregues
export async function processPayouts({ partner_type, cycle_type = "weekly" }) {
  const r = await fetch(`${ADMIN_PAYOUTS}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ partner_type, cycle_type }),
  });
  return handle(r);
}

// Marcar como pago
export async function markPayoutPaid(id, { payment_method, payment_ref, paid_at } = {}) {
  const r = await fetch(`${ADMIN_PAYOUTS}/${id}/mark-paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ payment_method, payment_ref, paid_at }),
  });
  return handle(r);
}

// Cancelar
export async function cancelPayout(id) {
  const r = await fetch(`${ADMIN_PAYOUTS}/${id}/cancel`, {
    method: "POST",
    headers: { ...authHeaders() },
    credentials: "include",
  });
  return handle(r);
}
