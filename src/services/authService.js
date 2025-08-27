const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://inksa-auth-flask-dev.onrender.com';
const AUTH_TOKEN_KEY = 'adminAuthToken';
const ADMIN_USER_DATA_KEY = 'adminUser';

const processResponse = async (response) => {
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_DATA_KEY);
        window.location.href = '/login';
        return null;
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

const authService = {
    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password,
                    user_type: 'admin' 
                }),
            });

            const data = await processResponse(response);
            
            if (data && data.token) {
                localStorage.setItem(AUTH_TOKEN_KEY, data.token);
                localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(data.user));
                return data;
            }
            
            throw new Error('Token não recebido');
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    },

    async logout() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(ADMIN_USER_DATA_KEY);
            window.location.href = '/login';
        }
    },

    // Dashboard KPIs
    async getKpiSummary() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/kpi-summary`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await processResponse(response);
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar KPIs:', error);
            throw error;
        }
    },

    // Gráfico de Faturamento
    async getRevenueChartData() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/stats/revenue-chart`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await processResponse(response);
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar dados do gráfico de faturamento:', error);
            throw error;
        }
    },

    // Pedidos Recentes
    async getRecentOrders() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/orders/recent`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await processResponse(response);
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar pedidos recentes:', error);
            throw error;
        }
    },

    // Dashboard e Analytics (ainda disponível se precisar buscar todos de uma vez)
    async getDashboardStats() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    },

    // Gestão de Usuários
    async getUsers(filters = {}) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${API_BASE_URL}/api/admin/users?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            throw error;
        }
    },

    async updateUser(userId, userData) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    },

    async blockUser(userId, reason) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/block`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao bloquear usuário:', error);
            throw error;
        }
    },

    // Gestão de Restaurantes
    async getRestaurants(filters = {}) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${API_BASE_URL}/api/admin/restaurants?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar restaurantes:', error);
            throw error;
        }
    },

    async approveRestaurant(restaurantId) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/restaurants/${restaurantId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao aprovar restaurante:', error);
            throw error;
        }
    },

    // Gestão de Pedidos
    async getOrders(filters = {}) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${API_BASE_URL}/api/admin/orders?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            throw error;
        }
    },

    // Relatórios
    async getReports(type, period) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/reports/${type}?period=${period}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar relatórios:', error);
            throw error;
        }
    },

    // Configurações do Sistema
    async getSystemSettings() {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            throw error;
        }
    },

    async updateSystemSettings(settings) {
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            throw error;
        }
    },

    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getCurrentAdmin() {
        const adminStr = localStorage.getItem(ADMIN_USER_DATA_KEY);
        return adminStr ? JSON.parse(adminStr) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem(AUTH_TOKEN_KEY);
    }
};

export default authService;
