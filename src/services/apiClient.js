// src/services/apiClient.js
// Wrapper global de fetch com:
//  1. Verificacao proativa de token JWT expirado (decoda o `exp`)
//  2. Intercepcao de 401/403

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

export function isTokenExpired(token, marginSeconds = 30) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Math.floor(Date.now() / 1000) >= payload.exp - marginSeconds;
}

function expireSessionLocally() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

export async function apiFetch(input, init = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    expireSessionLocally();
    return new Response(JSON.stringify({ status: 'error', error: 'Sessão expirada' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let response;
  try {
    response = await fetch(input, init);
  } catch (networkError) {
    throw networkError;
  }
  if (response.status === 401 || response.status === 403) {
    expireSessionLocally();
  }
  return response;
}
