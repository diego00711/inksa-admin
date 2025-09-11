// src/services/authService.js - VERSÃO CORRIGIDA PARA ADMIN
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const AUTH_TOKEN_KEY = 'admin_token';
const ADMIN_USER_DATA_KEY = 'admin_user_data';

const processResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }
    
    return response.json();
};

const authService = {
    async login(email, password) {
        try {
            console.log('🔐 Tentando login admin com:', email);
            
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
            console.log('📥 Resposta recebida:', data);
            
            // ✅ CORREÇÃO: Verificar múltiplos formatos de resposta
            let token = null;
            let userData = null;
            
            // Formato 1: token direto em data.token
            if (data.token) {
                token = data.token;
                userData = data.user;
            }
            // Formato 2: token em session.access_token (SUPABASE)
            else if (data.session && data.session.access_token) {
                token = data.session.access_token;
                userData = data.user;
            }
            // Formato 3: token em access_token direto
            else if (data.access_token) {
                token = data.access_token;
                userData = data.user;
            }
            
            if (token && userData) {
                // Verificar se é admin
                if (userData.user_type !== 'admin' && userData.user_type !== 'restaurant') {
                    throw new Error('Acesso negado. Apenas administradores podem acessar este painel.');
                }
                
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(userData));
                
                console.log('✅ Login admin realizado com sucesso');
                return { token, user: userData };
            }
            
            throw new Error('Token não recebido na resposta');
        } catch (error) {
            console.error('❌ Erro no login admin:', error);
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

    getCurrentUser() {
        try {
            const userData = localStorage.getItem(ADMIN_USER_DATA_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Erro ao obter usuário atual:', error);
            return null;
        }
    },

    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    isAuthenticated() {
        const token = this.getToken();
        const user = this.getCurrentUser();
        return !!(token && user);
    },

    // Método para verificar se o token ainda é válido
    async verifyToken() {
        try {
            const token = this.getToken();
            if (!token) return false;

            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.ok;
        } catch (error) {
            console.error('Erro na verificação do token:', error);
            return false;
        }
    },

    // Dashboard e Analytics
    async getDashboardStats() {
        try {
            const token = this.getToken();
            const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar estatísticas do dashboard:', error);
            throw error;
        }
    },

    // Métodos para gerenciar usuários
    async getUsers(page = 1, limit = 10, userType = null) {
        try {
            const token = this.getToken();
            let url = `${API_BASE_URL}/api/admin/users?page=${page}&limit=${limit}`;
            if (userType) url += `&user_type=${userType}`;

            const response = await fetch(url, {
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

    async updateUserStatus(userId, isActive) {
        try {
            const token = this.getToken();
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: isActive }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao atualizar status do usuário:', error);
            throw error;
        }
    },

    // Métodos para gerenciar pedidos
    async getOrders(page = 1, limit = 10, status = null) {
        try {
            const token = this.getToken();
            let url = `${API_BASE_URL}/api/orders?page=${page}&limit=${limit}`;
            if (status) url += `&status=${status}`;

            const response = await fetch(url, {
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

    // Métodos para relatórios financeiros
    async getFinancialReport(startDate, endDate) {
        try {
            const token = this.getToken();
            const response = await fetch(`${API_BASE_URL}/api/admin/financial-report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ start_date: startDate, end_date: endDate }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar relatório financeiro:', error);
            throw error;
        }
    },

    // Métodos para logs de auditoria
    async getAuditLogs(page = 1, limit = 20) {
        try {
            const token = this.getToken();
            const response = await fetch(`${API_BASE_URL}/api/admin/logs?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao buscar logs de auditoria:', error);
            throw error;
        }
    },

    // Método para enviar notificações
    async sendNotification(type, title, message, targetUsers = null) {
        try {
            const token = this.getToken();
            const response = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    title,
                    message,
                    target_users: targetUsers,
                }),
            });

            return await processResponse(response);
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            throw error;
        }
    }
};

export default authService;
