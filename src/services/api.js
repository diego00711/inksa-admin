// src/services/api.js
import authService from "./authService";

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

async function apiFetch(path, options = {}) {
  const token = authService.getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers,
  });

  // tenta parsear json; se falhar, retorna objeto vazio
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.message || data.error || `Erro HTTP ${res.status} em ${path}`;
    throw new Error(msg);
  }

  return data;
}

export default apiFetch;
