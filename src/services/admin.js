// src/services/admin.js
import { apiRequest } from './api';

// Dashboard agregado (KPIs, gráfico, últimos pedidos)
export const getAdminDashboard = () =>
  apiRequest('/api/admin/dashboard');

// Usuários (filtros opcionais)
export const getAdminUsers = ({ user_type, city } = {}) =>
  apiRequest('/api/admin/users', {
    params: {
      user_type: user_type || undefined, // 'client' | 'restaurant' | 'delivery' | 'admin'
      city: city || undefined,
    },
  });

// Restaurantes (lista)
export const getAdminRestaurants = () =>
  apiRequest('/api/admin/restaurants');

// Transações (se tiver no backend)
export const getAdminTransactions = (params = {}) =>
  apiRequest('/api/admin/transactions', { params });
