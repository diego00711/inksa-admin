// Serviço de API para payouts
const API_BASE = import.meta.env.VITE_API_BASE || "";

function getAuthHeader() {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function processPayouts(payload) {
  const res = await fetch(`${API_BASE}/api/admin/payouts/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Erro ao processar payouts (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
