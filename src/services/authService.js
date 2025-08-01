// Local: src/services/authService.js

// OTIMIZADO: URL base da API
const API_BASE_URL = 'http://127.0.0.1:5000/api';
const AUTH_TOKEN_KEY = 'adminAuthToken';

// ALTERADO: Função de processamento de resposta para lidar com o erro 401
const processResponse = async (response) => {
  // NOVO: Tratamento específico para o erro 401 (Token Expirado ou Inválido)
  if (response.status === 401) {
    // Replicamos a lógica de logout aqui para garantir o funcionamento correto
    // e evitar erros de "Cannot access 'AuthService' before initialization".
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/login';
    // Lança um erro claro para o utilizador, que não será visto devido ao redirecionamento, mas é uma boa prática.
    throw new Error('A sua sessão expirou. Por favor, faça login novamente.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Erro HTTP ${response.status}`;
    throw new Error(errorMessage);
  }
  return response.json();
};

const createAuthHeaders = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        // Se não houver token, redireciona para o login
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = '/login';
        throw new Error('Usuário não autenticado. Token não encontrado.');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

const AuthService = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await processResponse(response);
    if (data.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    } else {
      throw new Error('Login falhou: Token de acesso não recebido.');
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/login';
  },

  isAuthenticated: () => !!localStorage.getItem(AUTH_TOKEN_KEY),

  getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),

  // MODIFICADO: Agora aceita um segundo parâmetro 'cityFilter'
  getAllUsers: async (userType = null, cityFilter = '') => {
    const params = new URLSearchParams(); // Cria um novo URLSearchParams
    if (userType && userType.toLowerCase() !== 'todos') {
      params.append('user_type', userType); // Adiciona o tipo de usuário se não for 'todos'
    }
    if (cityFilter) { // Adiciona o filtro de cidade se não estiver vazio
      params.append('city', cityFilter);
    }

    let url = `${API_BASE_URL}/admin/users`;
    if (params.toString()) { // Se houver parâmetros, adiciona-os à URL
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data;
  },

  getAllRestaurants: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/restaurants`, {
        method: 'GET',
        headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data;
  },

  getKpiSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/kpi-summary`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data;
  },

  updateRestaurant: async (restaurantId, restaurantData) => {
    const response = await fetch(`${API_BASE_URL}/admin/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: createAuthHeaders(),
        body: JSON.stringify(restaurantData),
    });
    const data = await processResponse(response);
    return data;
},

  getRevenueChartData: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/stats/revenue-chart`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data;
  },

  getRecentOrders: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/orders/recent`, {
        method: 'GET',
        headers: createAuthHeaders(),
    });
    const data = await processResponse(response);
    return data.data;
  },
};

export default AuthService;