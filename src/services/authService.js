// src/services/authService.js

// Use a mesma env do Vercel (VITE_API_BASE_URL). Mantive fallback para VITE_API_URL.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://inksa-auth-flask-dev.onrender.com'
).replace(/\/+$/, '');

const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

const processResponse = async (response) => {
  if (response.status === 401) {
    // token inválido/ausente – limpa e volta ao login
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_DATA_KEY);
    window.location.href = '/login';
    return null;
  }

  // tenta parsear o json (mesmo em erro)
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = body.message || body.error || `HTTP error ${response.status}`;
    throw new Error(msg);
  }

  return body;
};

const authService = {
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          user_type: 'admin',
        }),
      });

      const result = await processResponse(res);
      if (!result) throw new Error('Falha ao autenticar');

      // ✅ Backend retorna: { status, message, access_token, data: { user: {...} } }
      const token =
        result.access_token ??
        result.data?.token ?? // fallback se algum dia vier aninhado
        null;

      if (!token) throw new Error('Token não recebido do servidor');

      localStorage.setItem(AUTH_TOKEN_KEY, token);

      const user = result.data?.user ?? null;
      if (user) {
        localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(user));
      }

      // padroniza retorno
      return { token, user };
    } catch (err) {
      console.error('Erro no login:', err);
      throw err;
    }
  },

  async logout() {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
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
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/kpi-summary`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    const result = await processResponse(res);
    return result?.data;
  }

  ,
  async getRevenueChartData() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/stats/revenue-chart`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    const result = await processResponse(res);
    return result?.data;
  }

  ,
  async getRecentOrders() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/orders/recent`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    const result = await processResponse(res);
    return result?.data;
  }

  ,
  // Endpoint que o Dashboard usa para pegar tudo de uma vez
  async getDashboardStats() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return await processResponse(res);
  }

  ,
  // -------- Usuários --------

  async getUsers(filters = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const qs = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE_URL}/api/admin/users?${qs}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return await processResponse(res);
  }

  ,
  async updateUser(userId, userData) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return await processResponse(res);
  }

  ,
  async blockUser(userId, reason) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/block`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    return await processResponse(res);
  }

  ,
  // -------- Restaurantes --------

  async getRestaurants(filters = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const qs = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE_URL}/api/admin/restaurants?${qs}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return await processResponse(res);
  }

  ,
  async approveRestaurant(restaurantId) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(
      `${API_BASE_URL}/api/admin/restaurants/${restaurantId}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      }
    );
    return await processResponse(res);
  }

  ,
  // -------- Pedidos --------

  async getOrders(filters = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const qs = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE_URL}/api/admin/orders?${qs}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return await processResponse(res);
  }

  ,
  // -------- Relatórios --------

  async getReports(type, period) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(
      `${API_BASE_URL}/api/admin/reports/${type}?period=${period}`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      }
    );
    return await processResponse(res);
  }

  ,
  // -------- Configurações --------

  async getSystemSettings() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return await processResponse(res);
  }

  ,
  async updateSystemSettings(settings) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return await processResponse(res);
  }

  ,

  // -------- helpers --------

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
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
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },
};

export default authService;
