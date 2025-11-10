// src/services/authService.js

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

const processResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
    window.location.href = '/login';
    return null;
  }

  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const msg = body.message || body.error || `HTTP error ${response.status}`;
    throw new Error(msg);
  }

  return body;
};

function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function authorizedRequest(path, { method = 'GET', params, body, headers = {} } = {}) {
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

  return processResponse(response);
}

const authService = {
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          user_type: 'admin',
        }),
      });

      const result = await processResponse(response);
      if (!result) throw new Error('Falha ao autenticar');

      const token =
        result.access_token ??
        result.data?.token ??
        null;

      if (!token) throw new Error('Token não recebido do servidor');

      localStorage.setItem(AUTH_TOKEN_KEY, token);

      const user = result.data?.user ?? null;
      if (user) {
        localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(user));
      }

      return { token, user };
    } catch (err) {
      console.error('Erro no login:', err);
      throw err;
    }
  },

  async logout() {
    try {
      const token = getStoredToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_DATA_KEY);
      window.location.href = '/login';
    }
  },

  // -------- Dashboard --------

  async getKpiSummary() {
    const result = await authorizedRequest('/api/admin/kpi-summary');
    return result?.data ?? result;
  },

  async getRevenueChartData() {
    const result = await authorizedRequest('/api/admin/stats/revenue-chart');
    return result?.data ?? result;
  },

  async getRecentOrders() {
    const result = await authorizedRequest('/api/admin/orders/recent');
    return result?.data ?? result;
  },

  async getDashboardStats() {
    return authorizedRequest('/api/admin/dashboard');
  },

  // -------- Usuários --------

  async getUsers(filters = {}) {
    return authorizedRequest('/api/admin/users', { params: filters });
  },

  async updateUser(userId, userData) {
    return authorizedRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: userData,
    });
  },

  async blockUser(userId, reason) {
    return authorizedRequest(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      body: { reason },
    });
  },

  // -------- Restaurantes --------

  async getRestaurants(filters = {}) {
    return authorizedRequest('/api/admin/restaurants', { params: filters });
  },

  async getAllRestaurants(filters = {}) {
    const result = await this.getRestaurants(filters);
    const payload = result?.data ?? result;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;

    return [];
  },

  async updateRestaurant(restaurantId, restaurantData) {
    return authorizedRequest(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PUT',
      body: restaurantData,
    });
  },

  async approveRestaurant(restaurantId) {
    return authorizedRequest(`/api/admin/restaurants/${restaurantId}/approve`, {
      method: 'POST',
    });
  },

  // -------- Pedidos --------

  async getOrders(filters = {}) {
    return authorizedRequest('/api/admin/orders', { params: filters });
  },

  // -------- Relatórios --------

  async getReports(type, period) {
    return authorizedRequest(`/api/admin/reports/${type}`, {
      params: { period },
    });
  },

  // -------- Configurações --------

  async getSystemSettings() {
    return authorizedRequest('/api/admin/settings');
  },

  async updateSystemSettings(settings) {
    return authorizedRequest('/api/admin/settings', {
      method: 'PUT',
      body: settings,
    });
  },

  // -------- Helpers --------

  getToken() {
    return getStoredToken();
  },

  getCurrentAdmin() {
    try {
      const raw = localStorage.getItem(ADMIN_USER_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!getStoredToken();
  },
};

export default authService;
