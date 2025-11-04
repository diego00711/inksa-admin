// src/services/payouts.js
const API = import.meta.env.VITE_API_URL;

function authHeaders() {
  const t = localStorage.getItem("access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function listPayouts(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  ).toString();
  const r = await fetch(`${API}/api/admin/payouts${qs ? `?${qs}` : ""}`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function getPayout(id) {
  const r = await fetch(`${API}/api/admin/payouts/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function createPayout(payload) {
  const r = await fetch(`${API}/api/admin/payouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function approvePayout(id) {
  const r = await fetch(`${API}/api/admin/payouts/${id}/approve`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function rejectPayout(id, reason = "") {
  const r = await fetch(`${API}/api/admin/payouts/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ reason }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function payPayout(id, external_ref) {
  const r = await fetch(`${API}/api/admin/payouts/${id}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ external_ref }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
