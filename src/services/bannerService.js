import { buildUrl, getServiceBaseUrl, getStoredToken, request } from './api';

const BANNERS_ENDPOINT = '/api/banners';

class BannerService {
  async getAllBanners() {
    return request(BANNERS_ENDPOINT, { service: 'banners' });
  }

  async createPromotionalBanner(bannerData) {
    return request(BANNERS_ENDPOINT, {
      method: 'POST',
      body: {
        ...bannerData,
        is_sponsored: false,
        banner_type: 'promotional',
      },
      service: 'banners',
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
      service: 'banners',
    });
  }

  async updateBanner(id, updates) {
    return request(`${BANNERS_ENDPOINT}/${id}`, {
      method: 'PUT',
      body: updates,
      service: 'banners',
    });
  }

  async deleteBanner(id) {
    return request(`${BANNERS_ENDPOINT}/${id}`, {
      method: 'DELETE',
      service: 'banners',
    });
  }

  async uploadBannerImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const token = getStoredToken();
    const response = await fetch(
      buildUrl(`${BANNERS_ENDPOINT}/upload`, {}, getServiceBaseUrl('banners')),
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );

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
    return request(`${BANNERS_ENDPOINT}/analytics`, { service: 'banners' });
  }
}

export default new BannerService();
