// src/pages/admin/AdminBannerManagement.jsx

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Upload, 
  Calendar,
  TrendingUp,
  DollarSign,
  MousePointer,
  BarChart3,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import bannerService from '../../services/bannerService';
import { useToast } from '../../context/ToastContext';

export default function AdminBannerManagement() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const { addToast } = useToast();

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

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Carregar banners
  useEffect(() => {
    fetchBanners();
    fetchAnalytics();
  }, []);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const data = await bannerService.getActiveBanners();
      setBanners(data);
    } catch (error) {
      addToast('error', 'Erro ao carregar banners: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await bannerService.getBannerAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  // Upload de imagem
  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const fileName = `banner-${Date.now()}-${file.name}`;
      const imageUrl = await bannerService.uploadBannerImage(file, fileName);
      setFormData({ ...formData, image_url: imageUrl });
      addToast('success', 'Imagem carregada com sucesso!');
    } catch (error) {
      addToast('error', 'Erro ao carregar imagem: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Salvar banner
  const handleSaveBanner = async () => {
    try {
      if (editingBanner) {
        await bannerService.updateBanner(editingBanner.id, formData);
        addToast('success', 'Banner atualizado com sucesso!');
      } else {
        if (formData.is_sponsored) {
          await bannerService.createSponsoredBanner(formData);
        } else {
          await bannerService.createPromotionalBanner(formData);
        }
        addToast('success', 'Banner criado com sucesso!');
      }
      
      fetchBanners();
      fetchAnalytics();
      closeModal();
    } catch (error) {
      addToast('error', 'Erro ao salvar banner: ' + error.message);
    }
  };

  // Alternar status do banner
  const handleToggleStatus = async (bannerId, currentStatus) => {
    try {
      await bannerService.toggleBannerStatus(bannerId, !currentStatus);
      addToast('success', `Banner ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchBanners();
    } catch (error) {
      addToast('error', 'Erro ao alterar status: ' + error.message);
    }
  };

  // Deletar banner
  const handleDeleteBanner = async (bannerId) => {
    if (window.confirm('Tem certeza que deseja deletar este banner?')) {
      try {
        await bannerService.deleteBanner(bannerId);
        addToast('success', 'Banner deletado com sucesso!');
        fetchBanners();
        fetchAnalytics();
      } catch (error) {
        addToast('error', 'Erro ao deletar banner: ' + error.message);
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
    setIsCreateModalOpen(true);
  };

  // Fechar modal
  const closeModal = () => {
    setIsCreateModalOpen(false);
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
    setSelectedImage(null);
  };

  // Calcular métricas
  const getTotalClicks = () => analytics.reduce((sum, banner) => sum + (banner.click_count || 0), 0);
  const getTotalImpressions = () => analytics.reduce((sum, banner) => sum + (banner.impression_count || 0), 0);
  const getTotalRevenue = () => analytics.reduce((sum, banner) => sum + (banner.total_spent || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gerenciar Banners</h1>
          <p className="text-gray-600">Gerencie banners promocionais e patrocinados</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Editar Banner' : 'Criar Novo Banner'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do banner abaixo
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Tipo de Banner */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Banner</Label>
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
                  <Label>Ordem de Exibição</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Título e Subtítulo */}
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título do banner"
                />
              </div>
              
              <div>
                <Label>Subtítulo</Label>
                <Textarea
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Descrição do banner"
                  rows={2}
                />
              </div>

              {/* Upload de Imagem */}
              <div>
                <Label>Imagem do Banner</Label>
                <div className="flex gap-4 items-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setSelectedImage(file);
                        handleImageUpload(file);
                      }
                    }}
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
                <Label>URL de Destino</Label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="/restaurantes/id-do-restaurante ou URL externa"
                />
              </div>

              {/* Campos específicos para banners patrocinados */}
              {formData.is_sponsored && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Patrocinador</Label>
                      <Input
                        value={formData.sponsor_name}
                        onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                        placeholder="Nome do restaurante"
                      />
                    </div>
                    <div>
                      <Label>ID do Restaurante</Label>
                      <Input
                        value={formData.restaurant_id}
                        onChange={(e) => setFormData({ ...formData, restaurant_id: e.target.value })}
                        placeholder="UUID do restaurante"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Custo por Clique (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cost_per_click}
                        onChange={(e) => setFormData({ ...formData, cost_per_click: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Orçamento Total (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_budget}
                        onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Início</Label>
                      <Input
                        type="date"
                        value={formData.campaign_start_date}
                        onChange={(e) => setFormData({ ...formData, campaign_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data de Fim</Label>
                      <Input
                        type="date"
                        value={formData.campaign_end_date}
                        onChange={(e) => setFormData({ ...formData, campaign_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={handleSaveBanner}>
                {editingBanner ? 'Atualizar' : 'Criar'} Banner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Banners</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{banners.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalClicks()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalImpressions()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {getTotalRevenue().toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Banners */}
      <Card>
        <CardHeader>
          <CardTitle>Banners Ativos</CardTitle>
          <CardDescription>
            Gerencie todos os banners da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando banners...</div>
          ) : banners.length === 0 ? (
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
                      <Badge variant={banner.is_sponsored ? "default" : "secondary"}>
                        {banner.is_sponsored ? 'Patrocinado' : 'Promocional'}
                      </Badge>
                      <Badge variant={banner.is_active ? "success" : "destructive"}>
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{banner.subtitle}</p>
                    
                    {banner.is_sponsored && (
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Cliques: {banner.click_count || 0}</span>
                        <span>Impressões: {banner.impression_count || 0}</span>
                        <span>CTR: {banner.impression_count > 0 ? ((banner.click_count || 0) / banner.impression_count * 100).toFixed(2) : 0}%</span>
                        {banner.total_budget && (
                          <span>Orçamento: R$ {banner.total_budget}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {banner.link_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openEditModal(banner)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(banner.id, banner.is_active)}>
                          {banner.is_active ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
