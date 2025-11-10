const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

export const AUTH_TOKEN_KEY = 'adminAuthToken';
export const ADMIN_USER_DATA_KEY = 'adminUser';

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getStoredToken() {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  if (!isBrowser()) return;
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function getStoredAdmin() {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin) {
  if (!isBrowser()) return;
  try {
    if (admin) {
      window.localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(admin));
    } else {
      window.localStorage.removeItem(ADMIN_USER_DATA_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function clearStoredSession({ redirectToLogin = true } = {}) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_USER_DATA_KEY);
    window.localStorage.removeItem('token');
  } catch {
    // ignore storage failures
  }
  if (redirectToLogin) {
    try {
      window.location.href = '/login';
    } catch {
      // ignore redirect failures
    }
  }
}

export function buildUrl(path, params = {}) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  return url.toString();
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request(path, {
  method = 'GET',
  params,
  body,
  headers = {},
  auth = true,
  raw = false,
  redirectOn401 = true,
} = {}) {
  const url = buildUrl(path, params);
  const token = auth ? getStoredToken() : null;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const finalHeaders = {
    Accept: 'application/json',
    ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
        ? body
        : typeof body === 'string'
        ? body
        : JSON.stringify(body),
  });

  if (response.status === 401 && auth) {
    clearStoredSession({ redirectToLogin: redirectOn401 });
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (raw) {
    return response;
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || `Falha na requisição (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

export async function get(path, options) {
  return request(path, { ...options, method: 'GET' });
}

export async function post(path, body, options) {
  return request(path, { ...options, method: 'POST', body });
}

export async function put(path, body, options) {
  return request(path, { ...options, method: 'PUT', body });
}

export async function del(path, options) {
  return request(path, { ...options, method: 'DELETE' });
}

export default {
  API_BASE_URL,
  AUTH_TOKEN_KEY,
  ADMIN_USER_DATA_KEY,
  getStoredToken,
  setStoredToken,
  getStoredAdmin,
  setStoredAdmin,
  clearStoredSession,
  buildUrl,
  request,
  get,
  post,
  put,
  del,
};
