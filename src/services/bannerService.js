// src/services/bannerService.js

const API_BASE = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
const API_URL = `${API_BASE}/api`;

class BannerService {
  // Método auxiliar para fazer requisições autenticadas
  async makeRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }

    return response.json();
  }

  // Buscar todos os banners
  async getAllBanners() {
    return this.makeRequest('/banners');
  }

  // Criar banner promocional
  async createPromotionalBanner(bannerData) {
    return this.makeRequest('/banners', {
      method: 'POST',
      body: JSON.stringify({
        ...bannerData,
        is_sponsored: false,
        banner_type: 'promotional'
      }),
    });
  }

  // Criar banner patrocinado
  async createSponsoredBanner(bannerData) {
    return this.makeRequest('/banners', {
      method: 'POST',
      body: JSON.stringify({
        ...bannerData,
        is_sponsored: true,
        banner_type: 'sponsored'
      }),
    });
  }

  // Atualizar banner
  async updateBanner(id, updates) {
    return this.makeRequest(`/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Deletar banner
  async deleteBanner(id) {
    return this.makeRequest(`/banners/${id}`, {
      method: 'DELETE',
    });
  }

  // Upload de imagem
  async uploadBannerImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/banners/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload da imagem');
    }

    const result = await response.json();
    return result.image_url;
  }

  // Alternar status do banner
  async toggleBannerStatus(id, isActive) {
    return this.updateBanner(id, { is_active: isActive });
  }

  // Buscar analytics dos banners
  async getBannerAnalytics() {
    return this.makeRequest('/banners/analytics');
  }
}

export default new BannerService();
