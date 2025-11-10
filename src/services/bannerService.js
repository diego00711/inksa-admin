import { buildUrl, getStoredToken, request } from './api';

const BANNERS_ENDPOINT = '/api/banners';

class BannerService {
  async getAllBanners() {
    return request(BANNERS_ENDPOINT);
  }

  async createPromotionalBanner(bannerData) {
    return request(BANNERS_ENDPOINT, {
      method: 'POST',
      body: {
        ...bannerData,
        is_sponsored: false,
        banner_type: 'promotional',
      },
    });
  }

  async createSponsoredBanner(bannerData) {
    return request(BANNERS_ENDPOINT, {
      method: 'POST',
      body: {
        ...bannerData,
        is_sponsored: true,
        banner_type: 'sponsored',
      },
    });
  }

  async updateBanner(id, updates) {
    return request(`${BANNERS_ENDPOINT}/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteBanner(id) {
    return request(`${BANNERS_ENDPOINT}/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadBannerImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const token = getStoredToken();
    const response = await fetch(buildUrl(`${BANNERS_ENDPOINT}/upload`), {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || 'Erro ao fazer upload da imagem');
    }

    return payload?.image_url || payload?.url || null;
  }

  async toggleBannerStatus(id, isActive) {
    return this.updateBanner(id, { is_active: isActive });
  }

  async getBannerAnalytics() {
    return request(`${BANNERS_ENDPOINT}/analytics`);
  }
}

export default new BannerService();
