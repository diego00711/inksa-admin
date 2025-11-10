// Local: src/pages/RestaurantesPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import AuthService from '../services/authService';
import { Loader2, Pencil, Star, Zap } from 'lucide-react';

export function RestaurantesPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  // NOVO: Estado para controlar o loading do botão de salvar
  const [isSaving, setIsSaving] = useState(false);

  const extractRatingInfo = (restaurant) => {
    if (!restaurant) return null;

    const ratingCandidate = [
      restaurant.average_rating,
      restaurant.avg_rating,
      restaurant.rating,
      restaurant.review_score,
      restaurant.score,
    ].find((value) => value !== undefined && value !== null);

    const ratingValue = ratingCandidate !== undefined && ratingCandidate !== null
      ? Number(ratingCandidate)
      : null;

    const reviewsCount = Number(
      restaurant.total_reviews ??
      restaurant.reviews_count ??
      restaurant.rating_count ??
      restaurant.num_reviews ??
      0
    );

    if ((ratingValue === null || Number.isNaN(ratingValue)) && reviewsCount === 0) {
      return null;
    }

    return {
      rating: ratingValue !== null && !Number.isNaN(ratingValue) ? ratingValue : 0,
      reviews: reviewsCount,
    };
  };

  const extractGamificationInfo = (restaurant) => {
    if (!restaurant) return null;

    const level =
      restaurant.gamification_level ??
      restaurant.level ??
      restaurant.rank ??
      restaurant.tier ??
      null;

    const pointsCandidate =
      restaurant.gamification_points ??
      restaurant.points ??
      restaurant.total_xp ??
      restaurant.xp ??
      null;

    const streakCandidate =
      restaurant.gamification_streak ??
      restaurant.streak ??
      restaurant.current_streak ??
      null;

    const hasData =
      (level !== null && level !== undefined) ||
      (pointsCandidate !== null && pointsCandidate !== undefined) ||
      (streakCandidate !== null && streakCandidate !== undefined);

    if (!hasData) return null;

    const points =
      pointsCandidate !== null && pointsCandidate !== undefined && !Number.isNaN(Number(pointsCandidate))
        ? Number(pointsCandidate)
        : null;

    const streak =
      streakCandidate !== null && streakCandidate !== undefined && !Number.isNaN(Number(streakCandidate))
        ? Number(streakCandidate)
        : null;

    return { level, points, streak };
  };

  // Função para buscar os dados iniciais
  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const data = await AuthService.getAllRestaurants();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os restaurantes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);
  
  const handleEditClick = (restaurant) => {
    setEditingRestaurant({ ...restaurant });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRestaurant(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditingRestaurant(prev => ({ ...prev, [name]: value }));
  };

  // ALTERADO: Lógica completa para salvar as alterações
  const handleSaveChanges = async () => {
    if (!editingRestaurant || !editingRestaurant.id) return;
  
    setIsSaving(true);
    try {
      // 1. Chama o serviço para enviar a atualização para o backend
      await AuthService.updateRestaurant(editingRestaurant.id, editingRestaurant);
  
      // 2. Atualiza a lista local para refletir a mudança instantaneamente na UI
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(r => 
          r.id === editingRestaurant.id ? editingRestaurant : r
        )
      );
      
      alert('Restaurante atualizado com sucesso!');
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert(`Erro ao salvar as alterações: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const name = restaurant.restaurant_name || '';
      const nameMatch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch =
        statusFilter === 'todos' ||
        (statusFilter === 'aberto' && restaurant.is_open) ||
        (statusFilter === 'fechado' && !restaurant.is_open);
      return nameMatch && statusMatch;
    });
  }, [restaurants, searchTerm, statusFilter]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">Erro ao carregar restaurantes: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Gestão de Restaurantes</h1>
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <input type="text" placeholder="Buscar por nome do restaurante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setStatusFilter('todos')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'todos' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Todos</button>
          <button onClick={() => setStatusFilter('aberto')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'aberto' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Abertos</button>
          <button onClick={() => setStatusFilter('fechado')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'fechado' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Fechados</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Nome do Restaurante</th>
                <th scope="col" className="px-6 py-3">CNPJ</th>
                <th scope="col" className="px-6 py-3">Telefone</th>
                <th scope="col" className="px-6 py-3">Cidade</th>
                <th scope="col" className="px-6 py-3">Avaliação</th>
                <th scope="col" className="px-6 py-3">Gamificação</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map(restaurant => (
                <tr key={restaurant.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{restaurant.restaurant_name || 'Não disponível'}</td>
                  <td className="px-6 py-4">{restaurant.cnpj || '-'}</td>
                  <td className="px-6 py-4">{restaurant.phone || '-'}</td>
                  <td className="px-6 py-4">{restaurant.address_city || '-'}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      const info = extractRatingInfo(restaurant);
                      if (!info) {
                        return <span className="text-sm text-gray-400">Sem dados</span>;
                      }

                      return (
                        <div className="flex flex-col">
                          <span className="flex items-center text-sm font-semibold text-gray-900">
                            <Star className="mr-1 h-4 w-4 text-yellow-500" fill="currentColor" />
                            {info.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {info.reviews === 1
                              ? '1 avaliação'
                              : `${info.reviews} avaliações`}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const info = extractGamificationInfo(restaurant);
                      if (!info) {
                        return <span className="text-sm text-gray-400">—</span>;
                      }

                      return (
                        <div className="flex flex-col text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            {info.level ? `Nível ${info.level}` : 'Nível não definido'}
                          </span>
                          {info.points !== null && (
                            <span className="flex items-center text-xs text-gray-500">
                              <Zap className="mr-1 h-3 w-3 text-indigo-500" />
                              {Number(info.points).toLocaleString('pt-BR')} XP
                            </span>
                          )}
                          {info.streak && info.streak > 0 && (
                            <span className="text-xs text-amber-600">🔥 {info.streak} dias de sequência</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ restaurant.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}>
                      {restaurant.is_open ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleEditClick(restaurant)} className="font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto" title="Editar Restaurante">
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRestaurants.length === 0 && (<p className="text-center text-gray-500 py-8">Nenhum restaurante encontrado com os filtros aplicados.</p>)}
        </div>
      </div>

      {isModalOpen && editingRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Editar Restaurante</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="md:col-span-2">
                <label htmlFor="restaurant_name" className="block text-sm font-medium text-gray-700">Nome do Restaurante</label>
                <input type="text" name="restaurant_name" id="restaurant_name" value={editingRestaurant.restaurant_name || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
              <div>
                <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">CNPJ</label>
                <input type="text" name="cnpj" id="cnpj" value={editingRestaurant.cnpj || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                <input type="text" name="phone" id="phone" value={editingRestaurant.phone || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
              <div className="md:col-span-2 mt-4"><h3 className="text-lg font-medium text-gray-900 border-b pb-2">Endereço</h3></div>
              <div>
                <label htmlFor="address_postal_code" className="block text-sm font-medium text-gray-700">CEP</label>
                <input type="text" name="address_postal_code" id="address_postal_code" value={editingRestaurant.address_postal_code || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
               <div>
                <label htmlFor="address_city" className="block text-sm font-medium text-gray-700">Cidade</label>
                <input type="text" name="address_city" id="address_city" value={editingRestaurant.address_city || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address_street" className="block text-sm font-medium text-gray-700">Rua</label>
                <input type="text" name="address_street" id="address_street" value={editingRestaurant.address_street || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
              <div>
                <label htmlFor="address_number" className="block text-sm font-medium text-gray-700">Número</label>
                <input type="text" name="address_number" id="address_number" value={editingRestaurant.address_number || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
              <div>
                <label htmlFor="address_neighborhood" className="block text-sm font-medium text-gray-700">Bairro</label>
                <input type="text" name="address_neighborhood" id="address_neighborhood" value={editingRestaurant.address_neighborhood || ''} onChange={handleFormChange} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"/>
              </div>
            </form>
            <div className="flex justify-end mt-8 space-x-4">
              <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
              {/* ALTERADO: Botão agora mostra estado de 'Salvando...' e fica desabilitado durante o processo */}
              <button onClick={handleSaveChanges} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}