import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const BannerManagementPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    is_active: true
  });

  // Carregar banners ao montar o componente
  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = authService.getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
      
      console.log('🔍 Carregando banners da API:', `${API_URL}/api/banners`);
      
      const response = await fetch(`${API_URL}/api/banners`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro da API:', errorText);
        throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Dados recebidos:', data);
      
      // Verificar se data.data existe e é um array
      const bannersData = Array.isArray(data.data) ? data.data : [];
      setBanners(bannersData);
      
      console.log('✅ Banners carregados:', bannersData.length);
      
    } catch (error) {
      console.error('❌ Erro ao carregar banners:', error);
      setError('Erro ao carregar banners: ' + error.message);
      setBanners([]); // Garantir que banners seja sempre um array
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.image_url) {
      setError('Título e URL da imagem são obrigatórios');
      return;
    }

    try {
      setError('');
      const token = authService.getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
      
      const url = editingBanner 
        ? `${API_URL}/api/banners/${editingBanner.id}`
        : `${API_URL}/api/banners`;
      
      const method = editingBanner ? 'PUT' : 'POST';

      console.log(`🚀 ${method} banner:`, url, formData);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      alert(editingBanner ? 'Banner atualizado com sucesso!' : 'Banner criado com sucesso!');
      await loadBanners();
      resetForm();
    } catch (error) {
      console.error('❌ Erro ao salvar banner:', error);
      setError('Erro ao salvar banner: ' + error.message);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      is_active: banner.is_active !== undefined ? banner.is_active : true
    });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (banner) => {
    if (!confirm(`Tem certeza que deseja deletar o banner "${banner.title}"?`)) {
      return;
    }

    try {
      setError('');
      const token = authService.getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
      
      const response = await fetch(`${API_URL}/api/banners/${banner.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      alert('Banner deletado com sucesso!');
      await loadBanners();
    } catch (error) {
      console.error('❌ Erro ao deletar banner:', error);
      setError('Erro ao deletar banner: ' + error.message);
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      setError('');
      const token = authService.getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
      
      const response = await fetch(`${API_URL}/api/banners/${banner.id}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const action = banner.is_active ? 'desativado' : 'ativado';
      alert(`Banner ${action} com sucesso!`);
      await loadBanners();
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      setError('Erro ao alterar status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      image_url: '',
      link_url: '',
      is_active: true
    });
    setEditingBanner(null);
    setShowForm(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Carregando banners...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Banners</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Novo Banner
        </button>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info sobre conexão */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              API URL: {import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com'}/api/banners
            </p>
            <p className="text-sm text-blue-800">
              Token presente: {authService.getToken() ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>
      </div>

      {/* Formulário Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingBanner ? 'Editar Banner' : 'Novo Banner'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <textarea
                  value={formData.subtitle}
                  onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">URL da Imagem *</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://exemplo.com/imagem.jpg"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Link de Destino</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/pagina ou https://exemplo.com"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  Banner ativo
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {editingBanner ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Banners */}
      <div className="bg-white rounded-lg shadow">
        {!Array.isArray(banners) || banners.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              {!Array.isArray(banners) ? 'Erro ao carregar banners' : 'Nenhum banner encontrado'}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Criar Primeiro Banner
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.map((banner) => (
                  <tr key={banner.id || Math.random()}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-16 h-10 object-cover rounded border"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40" viewBox="0 0 64 40"><rect width="64" height="40" fill="%23f3f4f6"/><text x="32" y="25" text-anchor="middle" fill="%236b7280" font-size="8">Erro na imagem</text></svg>';
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {banner.title}
                      </div>
                      {banner.subtitle && (
                        <div className="text-sm text-gray-500">
                          {banner.subtitle}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          banner.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {banner.display_order !== undefined ? banner.display_order : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(banner)}
                          className={`transition-colors ${
                            banner.is_active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {banner.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDelete(banner)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerManagementPage;
