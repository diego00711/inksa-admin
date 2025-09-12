// BannerManagementPage.jsx - VERSÃO MODIFICADA COM POSIÇÃO DO TEXTO

import React, { useState, useEffect, useRef } from 'react';
import authService from '../services/authService';

const BannerManagementPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);
  
  // NOVO: Adicionado 'text_position' ao estado inicial do formulário
  const getInitialFormData = () => ({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    is_active: true,
    text_position: 'center' // Valor padrão
  });

  const [formData, setFormData] = useState(getInitialFormData());

  const API_URL = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

  useEffect(( ) => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const token = authService.getToken();
      
      const response = await fetch(`${API_URL}/api/banners`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const data = await response.json();
      setBanners(Array.isArray(data.data) ? data.data : []);
      
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      setError('Erro ao carregar banners: ' + error.message);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    await uploadImage(file);
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      setError('');
      const token = authService.getToken();
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch(`${API_URL}/api/upload/banner-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.data.url }));
      
    } catch (error) {
      console.error('Erro no upload:', error);
      setError('Erro no upload da imagem: ' + error.message);
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.image_url) {
      setError('Título e imagem são obrigatórios');
      return;
    }

    try {
      setError('');
      const token = authService.getToken();
      
      const url = editingBanner 
        ? `${API_URL}/api/banners/${editingBanner.id}`
        : `${API_URL}/api/banners`;
      
      const method = editingBanner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), // formData já inclui text_position
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      alert(editingBanner ? 'Banner atualizado!' : 'Banner criado!');
      await loadBanners();
      resetForm();
    } catch (error) {
      setError('Erro ao salvar banner: ' + error.message);
    }
  };

  // NOVO: Atualizado para incluir 'text_position' ao editar
  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      is_active: banner.is_active !== undefined ? banner.is_active : true,
      text_position: banner.text_position || 'center' // Carrega a posição ou usa 'center' como padrão
    });
    setImagePreview(banner.image_url || '');
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (banner) => {
    if (!confirm(`Tem certeza que deseja deletar o banner "${banner.title}"?`)) return;

    try {
      setError('');
      const token = authService.getToken();
      
      const response = await fetch(`${API_URL}/api/banners/${banner.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      alert('Banner deletado com sucesso!');
      await loadBanners();
    } catch (error) {
      setError('Erro ao deletar banner: ' + error.message);
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      setError('');
      const token = authService.getToken();
      
      const response = await fetch(`${API_URL}/api/banners/${banner.id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      alert(`Banner ${banner.is_active ? 'desativado' : 'ativado'}!`);
      await loadBanners();
    } catch (error) {
      setError('Erro ao alterar status: ' + error.message);
    }
  };

  // NOVO: Atualizado para usar a função que retorna o estado inicial
  const resetForm = () => {
    setFormData(getInitialFormData());
    setEditingBanner(null);
    setShowForm(false);
    setError('');
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return <div className="text-lg text-center py-10">Carregando banners...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Banners</h1>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Novo Banner
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h2>
            
            <form onSubmit={handleSubmit}>
              {/* ... campos title, subtitle ... */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Título *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <textarea value={formData.subtitle} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" rows="2" />
              </div>

              {/* ... campo de upload de imagem ... */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Imagem do Banner *</label>
                {imagePreview && (
                  <div className="mb-3 relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded border" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">
                    {uploading ? 'Enviando...' : (imagePreview ? 'Trocar Imagem' : 'Selecionar Imagem')}
                  </button>
                </div>
                <input type="url" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 mt-2 text-sm" placeholder="URL da imagem" readOnly={!!imagePreview} />
              </div>

              {/* ... campo link_url ... */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Link de Destino</label>
                <input type="text" value={formData.link_url} onChange={(e) => setFormData({...formData, link_url: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" placeholder="/recompensas ou https://..." />
              </div>

              {/* NOVO: Campo para selecionar a posição do texto */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Posição do Texto</label>
                <select
                  value={formData.text_position}
                  onChange={(e ) => setFormData({ ...formData, text_position: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="center">Centro</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                </select>
              </div>

              {/* ... campo is_active e botões ... */}
              <div className="mb-6">
                <label className="flex items-center"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />Banner ativo</label>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={uploading || !formData.image_url} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                  {editingBanner ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {banners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum banner encontrado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                {/* NOVO: Coluna para Posição do Texto */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posição Texto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <td className="px-6 py-4"><img src={banner.image_url} alt={banner.title} className="w-16 h-10 object-cover rounded border" /></td>
                  <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{banner.title}</div></td>
                  {/* NOVO: Célula com o valor da posição */}
                  <td className="px-6 py-4">
                    <span className="text-sm capitalize text-gray-700">{banner.text_position || 'Centro'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {banner.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(banner)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                      <button onClick={() => handleToggleStatus(banner)} className={banner.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}>{banner.is_active ? 'Desativar' : 'Ativar'}</button>
                      <button onClick={() => handleDelete(banner)} className="text-red-600 hover:text-red-900">Deletar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BannerManagementPage;
