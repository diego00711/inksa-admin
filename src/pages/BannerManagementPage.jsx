// src/pages/BannerManagementPage.jsx

import React, { useState, useEffect } from 'react';
import bannerService from '../services/bannerService';
import { Loader2, Plus, Edit3, Trash2, Eye, EyeOff, Upload, MoreVertical, Image as ImageIcon, ExternalLink, DollarSign, MousePointer, BarChart3 } from 'lucide-react';

export default function BannerManagementPage() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [error, setError] = useState(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    restaurant_id: '',
    sponsor_name: '',
    banner_type: 'promotional',
    is_sponsored: false,
    campaign_start_date: '',
    campaign_end_date: '',
    cost_per_click: 0,
    total_budget: 0,
    display_order: 0
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Carregar banners
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const data = await bannerService.getAllBanners();
      setBanners(data.banners || data || []);
    } catch (error) {
      setError('Erro ao carregar banners: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de imagem
  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const imageUrl = await bannerService.uploadBannerImage(file);
      setFormData({ ...formData, image_url: imageUrl });
      alert('Imagem carregada com sucesso!');
    } catch (error) {
      alert('Erro ao carregar imagem: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Salvar banner
  const handleSaveBanner = async () => {
    try {
      if (editingBanner) {
        await bannerService.updateBanner(editingBanner.id, formData);
        alert('Banner atualizado com sucesso!');
      } else {
        if (formData.is_sponsored) {
          await bannerService.createSponsoredBanner(formData);
        } else {
          await bannerService.createPromotionalBanner(formData);
        }
        alert('Banner criado com sucesso!');
      }
      
      fetchBanners();
      closeModal();
    } catch (error) {
      alert('Erro ao salvar banner: ' + error.message);
    }
  };

  // Alternar status do banner
  const handleToggleStatus = async (bannerId, currentStatus) => {
    try {
      await bannerService.toggleBannerStatus(bannerId, !currentStatus);
      alert(`Banner ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchBanners();
    } catch (error) {
      alert('Erro ao alterar status: ' + error.message);
    }
  };

  // Deletar banner
  const handleDeleteBanner = async (bannerId) => {
    if (window.confirm('Tem certeza que deseja deletar este banner?')) {
      try {
        await bannerService.deleteBanner(bannerId);
        alert('Banner deletado com sucesso!');
        fetchBanners();
      } catch (error) {
        alert('Erro ao deletar banner: ' + error.message);
      }
    }
  };

  // Abrir modal de edição
  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      restaurant_id: banner.restaurant_id || '',
      sponsor_name: banner.sponsor_name || '',
      banner_type: banner.banner_type || 'promotional',
      is_sponsored: banner.is_sponsored || false,
      campaign_start_date: banner.campaign_start_date ? banner.campaign_start_date.split('T')[0] : '',
      campaign_end_date: banner.campaign_end_date ? banner.campaign_end_date.split('T')[0] : '',
      cost_per_click: banner.cost_per_click || 0,
      total_budget: banner.total_budget || 0,
      display_order: banner.display_order || 0
    });
    setIsModalOpen(true);
  };

  // Fechar modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      image_url: '',
      link_url: '',
      restaurant_id: '',
      sponsor_name: '',
      banner_type: 'promotional',
      is_sponsored: false,
      campaign_start_date: '',
      campaign_end_date: '',
      cost_per_click: 0,
      total_budget: 0,
      display_order: 0
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4 bg-red-100 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gerenciar Banners</h1>
          <p className="text-gray-600">Gerencie banners promocionais e patrocinados</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Banner
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Banners</p>
              <p className="text-2xl font-bold text-gray-900">{banners.length}</p>
            </div>
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Banners Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {banners.filter(b => b.is_active).length}
              </p>
            </div>
            <Eye className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patrocinados</p>
              <p className="text-2xl font-bold text-yellow-600">
                {banners.filter(b => b.is_sponsored).length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cliques</p>
              <p className="text-2xl font-bold text-blue-600">
                {banners.reduce((sum, b) => sum + (b.click_count || 0), 0)}
              </p>
            </div>
            <MousePointer className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Lista de Banners */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Banners</h2>
        </div>
        
        <div className="p-6">
          {banners.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum banner</h3>
              <p className="mt-1 text-sm text-gray-500">Comece criando seu primeiro banner.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div key={banner.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  {/* Preview da imagem */}
                  <div className="w-24 h-16 flex-shrink-0">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>

                  {/* Informações do banner */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{banner.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        banner.is_sponsored 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {banner.is_sponsored ? 'Patrocinado' : 'Promocional'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        banner.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{banner.subtitle}</p>
                    
                    {banner.is_sponsored && (
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Cliques: {banner.click_count || 0}</span>
                        <span>Impressões: {banner.impression_count || 0}</span>
                        {banner.total_budget && (
                          <span>Orçamento: R$ {banner.total_budget}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-2 text-gray-600 hover:text-blue-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleToggleStatus(banner.id, banner.is_active)}
                      className="p-2 text-gray-600 hover:text-green-600"
                    >
                      {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingBanner ? 'Editar Banner' : 'Criar Novo Banner'}
            </h2>
            
            <div className="space-y-4">
              {/* Tipo de Banner */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Banner
                  </label>
                  <select
                    value={formData.banner_type}
                    onChange={(e) => {
                      const isSponsored = e.target.value === 'sponsored';
                      setFormData({
                        ...formData,
                        banner_type: e.target.value,
                        is_sponsored: isSponsored
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="promotional">Promocional</option>
                    <option value="sponsored">Patrocinado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>

              {/* Título e Subtítulo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título do banner"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtítulo
                </label>
                <textarea
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Descrição do banner"
                  rows={2}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Upload de Imagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagem do Banner
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleImageUpload(file);
                      }
                    }}
                    className="flex-1 p-2 border rounded-md"
                  />
                  {uploadingImage && <span className="text-blue-600">Carregando...</span>}
                </div>
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              {/* URL de Destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Destino
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="/restaurantes/id-do-restaurante ou URL externa"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Campos específicos para banners patrocinados */}
              {formData.is_sponsored && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Patrocinador
                      </label>
                      <input
                        type="text"
                        value={formData.sponsor_name}
                        onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                        placeholder="Nome do restaurante"
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID do Restaurante
                      </label>
                      <input
                        type="text"
                        value={formData.restaurant_id}
                        onChange={(e) => setFormData({ ...formData, restaurant_id: e.target.value })}
                        placeholder="UUID do restaurante"
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custo por Clique (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost_per_click}
                        onChange={(e) => setFormData({ ...formData, cost_per_click: parseFloat(e.target.value) })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orçamento Total (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.total_budget}
                        onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        value={formData.campaign_start_date}
                        onChange={(e) => setFormData({ ...formData, campaign_start_date: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        value={formData.campaign_end_date}
                        onChange={(e) => setFormData({ ...formData, campaign_end_date: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBanner}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingBanner ? 'Atualizar' : 'Criar'} Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
