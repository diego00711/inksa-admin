// src/services/apiClient.js
// Wrapper global de fetch com:
//  1. Renovacao automatica da sessao (refresh_token) antes de o token vencer
//  2. Retry unico em 401 (renova e repete a chamada)
//  3. Logout SO quando a sessao e definitivamente invalida
//
// Antes daqui o token so era *detectado* como expirado e o usuario caia no
// login (~1h de sessao). Isso inviabilizava o painel de TV (/tv), que fica
// aberto 24/7 no escritorio.

import { API_BASE_URL } from './api';

const AUTH_TOKEN_KEY = 'adminAuthToken';
const REFRESH_TOKEN_KEY = 'adminRefreshToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

// Retorno especial: falha de REDE na renovacao. Nao invalida a sessao — quem
// chamou deve apenas tentar de novo mais tarde (a TV depende disso).
export const REFRESH_NETWORK_ERROR = 'REFRESH_NETWORK_ERROR';

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

// margem generosa: renova 60s antes de vencer, pra nunca mandar token morto
export function isTokenExpired(token, marginSeconds = 60) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Math.floor(Date.now() / 1000) >= payload.exp - marginSeconds;
}

function expireSessionLocally() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

// Uma unica renovacao em voo: se 5 telas pedirem ao mesmo tempo, so 1 request
let refreshPromise = null;

/**
 * Troca o refresh_token por um access_token novo.
 * @returns {Promise<string|null|'REFRESH_NETWORK_ERROR'>}
 *   token novo | null (sessao invalida -> deslogar) | REFRESH_NETWORK_ERROR
 */
export async function refreshSession() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!r.ok) return null; // 401: refresh_token revogado/invalido
      const json = await r.json();
      const token = json?.data?.token;
      const newRefresh = json?.data?.refresh_token;
      if (!token) return null;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      if (newRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      return token;
    } catch {
      // backend hibernando / wifi caiu: NAO desloga
      return REFRESH_NETWORK_ERROR;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function withAuthHeader(init, token) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

function unauthorizedResponse(message) {
  return new Response(JSON.stringify({ status: 'error', error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// IMPORTANTE: falha de rede NAO pode devolver 401 — o processResponse do
// authService redireciona pra /login em qualquer 401, entao um piscar de
// internet derrubaria a sessao (e a TV). 503 = "tenta de novo depois".
function offlineResponse(message) {
  return new Response(JSON.stringify({ status: 'error', error: message }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function apiFetch(input, init = {}) {
  let token = localStorage.getItem(AUTH_TOKEN_KEY);

  // 1) Token vencendo? renova ANTES de chamar
  if (token && isTokenExpired(token)) {
    const renewed = await refreshSession();
    if (renewed === REFRESH_NETWORK_ERROR) {
      // rede fora: 503 (nao 401) mantem a sessao viva pra proxima tentativa
      return offlineResponse('Sem conexão. Tentando novamente...');
    }
    if (!renewed) {
      expireSessionLocally();
      return unauthorizedResponse('Sessão expirada');
    }
    token = renewed;
  }

  const doFetch = (tk) => fetch(input, tk ? withAuthHeader(init, tk) : init);

  let response;
  try {
    response = await doFetch(token);
  } catch (networkError) {
    throw networkError;
  }

  // 2) 401 mesmo com token fresco? renova e tenta 1x
  if (response.status === 401) {
    const renewed = await refreshSession();
    if (renewed === REFRESH_NETWORK_ERROR) return response;
    if (renewed) {
      response = await doFetch(renewed);
      if (response.status !== 401 && response.status !== 403) return response;
    }
  }

  if (response.status === 401 || response.status === 403) {
    expireSessionLocally();
  }
  return response;
}
