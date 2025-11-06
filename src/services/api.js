// src/services/api.js
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

function getToken() {
  try {
    return localStorage.getItem('adminAuthToken');
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });

  if (res.status === 401) {
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('adminUser');
    // Se estiver fora do /login, volta pro login
    if (!location.pathname.includes('/login')) window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default {
  get:  (p)        => request(p),
  post: (p, body)  => request(p, { method: 'POST', body: JSON.stringify(body) }),
  put:  (p, body)  => request(p, { method: 'PUT',  body: JSON.stringify(body) }),
  del:  (p)        => request(p, { method: 'DELETE' }),
  baseURL: API_BASE_URL,
};
