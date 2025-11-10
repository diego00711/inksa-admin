import {
  API_BASE_URL,
  getStoredToken,
  setStoredToken,
  getStoredAdmin,
  setStoredAdmin,
  clearStoredSession,
  request,
} from './api';

function unwrapCollection(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

const authService = {
  API_BASE_URL,

  async login(email, password) {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
        user_type: 'admin',
      },
      auth: false,
      redirectOn401: false,
    });

    const token =
      response?.access_token ||
      response?.token ||
      response?.data?.token ||
      response?.data?.access_token ||
      null;

    if (!token) {
      throw new Error('Token não recebido do servidor.');
    }

    setStoredToken(token);
    try {
      window.localStorage.setItem('token', token);
    } catch {
      // ignore storage incompatibilities
    }

    const user = response?.user || response?.data?.user || null;
    if (user) {
      setStoredAdmin(user);
    }

    return { token, user };
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // se a sessão já expirou ignoramos o erro
      if (error?.message?.includes('Sessão expirada')) {
        // noop
      } else {
        console.warn('Falha ao encerrar sessão no backend:', error);
      }
    } finally {
      clearStoredSession({ redirectToLogin: true });
    }
  },

  async getKpiSummary(params = {}) {
    const result = await request('/api/admin/kpi-summary', { params });
    return result ?? {};
  },

  async getRevenueChartData(params = {}) {
    const result = await request('/api/admin/stats/revenue-chart', { params });
    return result ?? [];
  },

  async getRecentOrders(params = {}) {
    const result = await request('/api/admin/orders/recent', { params });
    return unwrapCollection(result);
  },

  async getDashboardStats(params = {}) {
    return request('/api/admin/dashboard', { params });
  },

  async getUsers(filters = {}) {
    return request('/api/admin/users', { params: filters });
  },

  async updateUser(userId, userData) {
    return request(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: userData,
    });
  },

  async blockUser(userId, reason) {
    return request(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      body: { reason },
    });
  },

  async getRestaurants(filters = {}) {
    return request('/api/admin/restaurants', { params: filters });
  },

  async getAllRestaurants(filters = {}) {
    const result = await this.getRestaurants(filters);
    return unwrapCollection(result);
  },

  async updateRestaurant(restaurantId, restaurantData) {
    return request(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PUT',
      body: restaurantData,
    });
  },

  async approveRestaurant(restaurantId) {
    return request(`/api/admin/restaurants/${restaurantId}/approve`, {
      method: 'POST',
    });
  },

  async getOrders(filters = {}) {
    return request('/api/admin/orders', { params: filters });
  },

  async getReports(type, period) {
    return request(`/api/admin/reports/${type}`, {
      params: { period },
    });
  },

  async getSystemSettings() {
    return request('/api/admin/settings');
  },

  async updateSystemSettings(settings) {
    return request('/api/admin/settings', {
      method: 'PUT',
      body: settings,
    });
  },

  getToken() {
    return getStoredToken();
  },

  getCurrentAdmin() {
    return getStoredAdmin();
  },

  isAuthenticated() {
    return Boolean(getStoredToken());
  },
};

export default authService;
