const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function parseResponse(response) {
  if (response.status === 401) {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_DATA_KEY);
    } catch {
      // ignore storage cleanup failures
    }
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `Falha na requisição (${response.status})`;
    throw new Error(message);
  }

  if (body === null) {
    return null;
  }

  return body.data ?? body;
}

async function request(path, { method = 'GET', params, body, headers = {} } = {}) {
  const token = getStoredToken();
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse(response);
}

async function listAdmins(params = {}) {
  return request('/api/admin/admins', { params });
}

async function createAdmin(adminData) {
  return request('/api/admin/admins', {
    method: 'POST',
    body: adminData,
  });
}

async function updateAdmin(adminId, updates) {
  return request(`/api/admin/admins/${adminId}`, {
    method: 'PUT',
    body: updates,
  });
}

async function deleteAdmin(adminId) {
  return request(`/api/admin/admins/${adminId}`, {
    method: 'DELETE',
  });
}

const adminsService = {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};

export default adminsService;
