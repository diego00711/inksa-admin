// src/services/authService.js

import { API_BASE_URL } from './api';
import { apiFetch } from './apiClient';

const AUTH_TOKEN_KEY = 'adminAuthToken';
const REFRESH_TOKEN_KEY = 'adminRefreshToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

const processResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
  const response = await apiFetch(url, {
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

      // Sem guardar o refresh_token o apiClient não consegue renovar a sessão
      // e o admin cai no login quando o access_token vence (~1h) — o que
      // derrubaria o painel de TV (/tv), que fica aberto direto.
      const refreshToken =
        result.refresh_token ??
        result.data?.refresh_token ??
        null;
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }

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

  // Painel de TV do escritorio (rota /tv). Numeros agregados + feed ao vivo.
  async getTvStats() {
    return authorizedRequest('/api/admin/tv/stats');
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
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_DATA_KEY);
      window.location.href = '/login';
    }
  },

  // -------- Dashboard --------
  // (getKpiSummary / getRevenueChartData / getRecentOrders removidas: apontavam
  // pra rotas que nao existem no backend e nenhuma tela as chamava — armadilhas
  // que dariam 404 se alguem as ligasse. Pente fino de 2026-07-15.)

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

  // Ativa/desativa o acesso do usuário (persiste em users.is_active)
  async setUserStatus(userId, status) {
    return authorizedRequest(`/api/users/${userId}`, {
      method: 'PATCH',
      body: { status }, // 'active' | 'inactive'
    });
  },

  // Envia e-mail de redefinição de senha (o admin não vê a senha)
  async resetUserPassword(userId) {
    return authorizedRequest(`/api/users/${userId}/reset-password`, {
      method: 'POST',
    });
  },

  // Exclui permanentemente o usuário (ação irreversível — confirmar no front)
  async deleteUser(userId) {
    return authorizedRequest(`/api/users/${userId}`, {
      method: 'DELETE',
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

  async approveRestaurant(restaurantId, approved = true) {
    return authorizedRequest(`/api/admin/restaurants/${restaurantId}/approve`, {
      method: 'POST',
      body: { approved },
    });
  },

  // -------- Clube (níveis/benefícios) --------

  async getClubLevels(audience) {
    return authorizedRequest('/api/club/admin/levels', { params: { audience } });
  },
  async createClubLevel(body) {
    return authorizedRequest('/api/club/admin/levels', { method: 'POST', body });
  },
  async updateClubLevel(id, body) {
    return authorizedRequest(`/api/club/admin/levels/${id}`, { method: 'PUT', body });
  },
  async deleteClubLevel(id) {
    return authorizedRequest(`/api/club/admin/levels/${id}`, { method: 'DELETE' });
  },

  // (getOrders e getReports removidas pelo mesmo motivo: rotas inexistentes,
  // zero chamadores. Relatorios reais vivem no financeApi de finance.js.)

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

  // -------- Inksa Social (Dia I) --------

  // Endpoint público, mas com o token de admin devolve o status completo
  // (valor arrecadado + breakdown) mesmo com a exibição nos apps desligada.
  async getSocialDayStatus() {
    return authorizedRequest('/api/public/social-day');
  },

  // Histórico/prestação de contas dos Dias I (alimenta a página pública /dia-i)
  async getSocialDayHistory() {
    return authorizedRequest('/api/public/social-day/history');
  },

  async createSocialEvent(event) {
    return authorizedRequest('/api/admin/social/events', { method: 'POST', body: event });
  },

  async updateSocialEvent(id, event) {
    return authorizedRequest(`/api/admin/social/events/${id}`, { method: 'PUT', body: event });
  },

  async deleteSocialEvent(id) {
    return authorizedRequest(`/api/admin/social/events/${id}`, { method: 'DELETE' });
  },

  // -------- Permissões --------

  async getPermissions(userId) {
    return authorizedRequest(`/api/admin/permissions/${userId}`);
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

  // Mescla campos no admin guardado (localStorage) — usado pra refletir o nome/
  // avatar editados no perfil sem precisar deslogar. O login só grava
  // id/email/user_type; nome e afins vivem em admin_profiles.
  updateStoredAdmin(patch = {}) {
    try {
      const raw = localStorage.getItem(ADMIN_USER_DATA_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const merged = { ...current, ...patch };
      localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return null;
    }
  },

  // Perfil do próprio admin logado (nome, cargo, telefone, avatar) — vem de
  // admin_profiles no backend.
  async getMyProfile() {
    const result = await authorizedRequest('/api/admin/profile');
    return result?.data ?? result;
  },

  isAuthenticated() {
    return !!getStoredToken();
  },
};

export default authService;
