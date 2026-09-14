// Local: src/pages/RestaurantesPage.jsx

import React, { useState, useEffect, useMemo, useContext } from 'react';
import AuthService from '../services/authService';
import { Loader2, Pencil, Star, Zap, CheckCircle2, Ban } from 'lucide-react';
import { NotificationContext } from '../context/NotificationContext';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

export function RestaurantesPage() {
  const { notify } = useContext(NotificationContext);
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  // Capa da loja: subida à parte do resto do formulário, porque é arquivo e
  // não texto — e porque tem que valer NA HORA, sem depender de salvar o
  // formulário inteiro.
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState('');
  // Migração das fotos do cardápio (importação que veio de fora)
  const [migrandoFotos, setMigrandoFotos] = useState(false);
  const [resultadoFotos, setResultadoFotos] = useState(null);
  const [enviandoZip, setEnviandoZip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [foundingId, setFoundingId] = useState(null);

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
      setError(mensagemDeErro(err, 'Não foi possível carregar os restaurantes.'));
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
    const { name, value, type, checked } = e.target;
    // Checkbox manda `checked`, não `value`. Sem este ramo, o toggle de
    // dinheiro gravaria a string "on" no lugar de true/false.
    setEditingRestaurant(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Sobe a capa da loja. Existe porque até 14/09/2026 SÓ O PARCEIRO conseguia
  // pôr a própria imagem — e quem cadastra loja nova é o admin. Loja sem capa
  // aparece na vitrine como um quadrado laranja com um prato desenhado: ela
  // estreia parecendo abandonada e fica assim até o lojista descobrir sozinho
  // que existe esse campo.
  const handleLogoUpload = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';                     // deixa reescolher o MESMO arquivo
    if (!arquivo || !editingRestaurant?.id) return;
    setErroLogo('');
    setEnviandoLogo(true);
    try {
      const r = await AuthService.uploadRestaurantLogo(editingRestaurant.id, arquivo);
      const url = r?.data?.logo_url || r?.logo_url;
      if (!url) throw new Error('O servidor não devolveu o endereço da imagem.');
      // Atualiza as DUAS: o formulário aberto e a lista por baixo. Sem a
      // segunda, fechar o modal parecia desfazer o que acabou de ser feito.
      setEditingRestaurant((prev) => (prev ? { ...prev, logo_url: url } : prev));
      setRestaurants((lista) =>
        lista.map((x) => (x.id === editingRestaurant.id ? { ...x, logo_url: url } : x))
      );
    } catch (err) {
      setErroLogo(err?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setEnviandoLogo(false);
    }
  };

  const handleMigrarFotos = async () => {
    if (!editingRestaurant?.id || migrandoFotos) return;
    setMigrandoFotos(true);
    try {
      const r = await AuthService.migrarFotosDoCardapio(editingRestaurant.id, 20);
      setResultadoFotos(r?.data || r);
    } catch (err) {
      setResultadoFotos({ erro: err?.message || 'Não foi possível trazer as fotos.' });
    } finally {
      setMigrandoFotos(false);
    }
  };

  const handleZipFotos = async (e) => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq || !editingRestaurant?.id) return;
    setEnviandoZip(true);
    setResultadoFotos(null);
    try {
      const r = await AuthService.enviarFotosEmLote(editingRestaurant.id, arq);
      const d = r?.data || r;
      setResultadoFotos({
        migradas: d.aplicadas,
        restantes: 0,
        falhas: [
          ...(d.falhas || []),
          // Arquivo sem item é a falha MAIS provável (nome não bate) e a que
          // quem enviou consegue corrigir sozinho — então aparece nomeada.
          ...(d.sem_item || []).map((f) => ({ item: f, motivo: 'nenhum item com esse nome' })),
        ],
      });
    } catch (err) {
      setResultadoFotos({ erro: err?.message || 'Não foi possível enviar o pacote.' });
    } finally {
      setEnviandoZip(false);
    }
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

      notify('Restaurante atualizado com sucesso!', 'success');
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      notify(`Erro ao salvar as alterações: ${mensagemDeErro(error, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.')}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Aprova/reprova um restaurante. Reprovar (approved=false) some ele do app
  // do cliente. approved null/true = aprovado; só false é "pendente".
  const handleToggleApproval = async (restaurant) => {
    const newApproved = restaurant.approved === false; // se estava pendente, aprova
    setApprovingId(restaurant.id);
    try {
      await AuthService.approveRestaurant(restaurant.id, newApproved);
      setRestaurants(prev =>
        prev.map(r => (r.id === restaurant.id ? { ...r, approved: newApproved } : r))
      );
      notify(newApproved ? 'Restaurante aprovado!' : 'Aprovação removida.', 'success');
    } catch (err) {
      notify(`Erro ao atualizar aprovação: ${mensagemDeErro(err, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.')}`, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  // Marca/desmarca o restaurante como Parceiro Fundador (comissão pela metade
  // até a data da campanha). Só afeta pedidos NOVOS — marcar antes de vender.
  const handleToggleFounding = async (restaurant) => {
    const next = !restaurant.fundador;
    setFoundingId(restaurant.id);
    try {
      await AuthService.setRestaurantFounding(restaurant.id, next);
      setRestaurants(prev =>
        prev.map(r => (r.id === restaurant.id ? { ...r, fundador: next } : r))
      );
      notify(next
        ? 'Restaurante marcado como Parceiro Fundador (comissão pela metade).'
        : 'Selo de Fundador removido.', 'success');
    } catch (err) {
      notify(`Erro ao atualizar Fundador: ${mensagemDeErro(err, 'tente de novo.', 'sem conexão agora — tente quando o sinal voltar.')}`, 'error');
    } finally {
      setFoundingId(null);
    }
  };

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const name = restaurant.restaurant_name || '';
      const nameMatch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch =
        statusFilter === 'todos' ||
        (statusFilter === 'aberto' && restaurant.is_open) ||
        (statusFilter === 'fechado' && !restaurant.is_open) ||
        (statusFilter === 'pendentes' && restaurant.approved === false);
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
      <h1 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Gestão de Parceiros</h1>
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <input type="text" placeholder="Buscar por nome do restaurante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-1/3 px-3 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setStatusFilter('todos')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'todos' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Todos</button>
          <button onClick={() => setStatusFilter('aberto')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'aberto' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Abertos</button>
          <button onClick={() => setStatusFilter('fechado')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'fechado' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Fechados</button>
          <button onClick={() => setStatusFilter('pendentes')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'pendentes' ? 'bg-yellow-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Pendentes</button>
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
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ restaurant.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}>
                        {restaurant.is_open ? 'Aberto' : 'Fechado'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ restaurant.approved !== false ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }`} title={restaurant.approved !== false ? 'Visível para os clientes' : 'Aguardando aprovação — invisível para os clientes'}>
                        {restaurant.approved !== false ? 'Aprovado' : 'Pendente'}
                      </span>
                      {restaurant.fundador && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 inline-flex items-center gap-1" title="Parceiro Fundador — comissão pela metade até o fim da campanha">
                          <Star className="w-3 h-3" fill="currentColor" /> Fundador
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleEditClick(restaurant)} className="font-medium text-blue-600 hover:text-blue-800 flex items-center min-h-[44px]" title="Editar Restaurante">
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleApproval(restaurant)}
                        disabled={approvingId === restaurant.id}
                        className={`font-medium flex items-center min-h-[44px] disabled:opacity-50 ${restaurant.approved !== false ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                        title={restaurant.approved !== false ? 'Reprovar (esconde do cliente)' : 'Aprovar (mostra ao cliente)'}
                      >
                        {approvingId === restaurant.id
                          ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          : (restaurant.approved !== false ? <Ban className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />)}
                        {restaurant.approved !== false ? 'Reprovar' : 'Aprovar'}
                      </button>
                      <button
                        onClick={() => handleToggleFounding(restaurant)}
                        disabled={foundingId === restaurant.id}
                        className={`font-medium flex items-center min-h-[44px] disabled:opacity-50 ${restaurant.fundador ? 'text-amber-600 hover:text-amber-800' : 'text-gray-500 hover:text-gray-700'}`}
                        title={restaurant.fundador ? 'Remover selo de Parceiro Fundador' : 'Tornar Parceiro Fundador (comissão pela metade)'}
                      >
                        {foundingId === restaurant.id
                          ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          : <Star className={`w-4 h-4 mr-1 ${restaurant.fundador ? 'fill-current' : ''}`} />}
                        {restaurant.fundador ? 'Fundador ✓' : 'Fundador'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRestaurants.length === 0 && (<p className="text-center text-gray-500 py-8">Nenhum restaurante encontrado com os filtros aplicados.</p>)}
        </div>
      </div>

      {isModalOpen && editingRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center px-4">
          <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-8 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto mx-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Editar Restaurante</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* CAPA — primeiro campo do formulário, de propósito.
                  É a única coisa ali que o CLIENTE vê antes de decidir entrar
                  na loja. Estando no fim, junto de dados bancários, quem
                  cadastra não lembra de preencher — e a loja nasce sem. */}
              <div className="md:col-span-2 border-b pb-4 mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capa da loja <span className="font-normal text-gray-500">— é o que aparece na vitrine do cliente</span>
                </label>
                <div className="flex items-center gap-4">
                  {editingRestaurant.logo_url ? (
                    <img
                      src={editingRestaurant.logo_url}
                      alt="Capa atual"
                      className="h-20 w-36 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-20 w-36 rounded-lg border border-dashed flex flex-col items-center justify-center bg-orange-50 text-orange-700">
                      <span className="text-2xl">🍽️</span>
                      <span className="text-[11px] font-semibold">sem capa</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <label className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      {enviandoLogo ? 'Enviando…' : (editingRestaurant.logo_url ? 'Trocar imagem' : 'Escolher imagem')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={enviandoLogo}
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {/* O tamanho não é capricho: o card corta a imagem em ~16:9.
                        Quem manda um retrato perde metade sem entender por quê. */}
                    <p className="mt-1 text-xs text-gray-500">
                      Deitada, tipo 1080×576. JPG, PNG ou WEBP, até 4 MB.
                    </p>
                    {erroLogo && <p className="mt-1 text-xs font-semibold text-red-600">{erroLogo}</p>}
                  </div>
                </div>

                {/* FOTOS DO CARDÁPIO VINDAS DE FORA.
                    Cardápio importado fica com as imagens no servidor de quem
                    veio — no caso da Mister fast-food, um concorrente. Se eles
                    tirarem as fotos, o cardápio inteiro fica cego de uma vez e
                    a gente descobre pelo cliente.
                    Vai em lotes de 20: 60 imagens passariam do tempo que o
                    servidor dá pra uma requisição. */}
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleMigrarFotos}
                      disabled={migrandoFotos}
                      className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {migrandoFotos ? 'Trazendo…' : 'Trazer fotos do cardápio'}
                    </button>
                    <p className="text-xs text-amber-900">
                      Copia pro nosso servidor as fotos que ainda estão hospedadas fora.
                    </p>
                    <label className={`cursor-pointer rounded-md border border-amber-600 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 ${enviandoZip ? 'opacity-60' : ''}`}>
                      {enviandoZip ? 'Enviando…' : 'Enviar pacote .zip'}
                      <input type="file" accept=".zip,application/zip" className="hidden"
                             disabled={enviandoZip} onChange={handleZipFotos} />
                    </label>
                  </div>
                  {/* O nome do ARQUIVO tem que bater com o nome do item. Não há
                      adivinhação por semelhança de propósito: tentamos e saiu
                      foto de sanduíche numa porção de coração. */}
                  <p className="mt-1 text-[11px] text-amber-800">
                    No pacote, cada arquivo precisa ter o nome do item (ex.: <code>x-bacon-com-ovo.jpg</code>).
                  </p>
                  {resultadoFotos && (
                    <div className="mt-2 text-xs">
                      {resultadoFotos.erro ? (
                        <p className="font-semibold text-red-600">{resultadoFotos.erro}</p>
                      ) : (
                        <>
                          <p className="font-semibold text-amber-900">
                            {resultadoFotos.migradas} foto(s) trazida(s)
                            {resultadoFotos.restantes > 0
                              ? ` — faltam ${resultadoFotos.restantes}, toque de novo.`
                              : ' — nenhuma sobrou fora.'}
                          </p>
                          {/* Falha com MOTIVO, não só contagem: "3 falharam" não
                              é diagnóstico, é adivinhação. */}
                          {resultadoFotos.falhas?.length > 0 && (
                            <ul className="mt-1 list-disc pl-4 text-red-700">
                              {resultadoFotos.falhas.slice(0, 5).map((f, i) => (
                                <li key={i}>{f.item}: {f.motivo}</li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

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
              {/* PAGAMENTO EM DINHEIRO — controle SÓ do admin.
                  Saiu do app do Parceiro de propósito: o dono ligava "aceito
                  dinheiro" entendendo que o entregador traria o dinheiro dele.
                  Na mecânica da Inksa o entregador FICA com o dinheiro e passa
                  a dever à plataforma; a loja recebe no repasse, não no balcão.
                  Essa distância entre o que ele entende e o que acontece é
                  briga garantida — então quem liga é quem conhece a mecânica. */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    name="accepts_cash"
                    checked={!!editingRestaurant.accepts_cash}
                    onChange={handleFormChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Aceitar pagamento em dinheiro
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  O entregador recolhe em espécie e fica devendo à plataforma; a loja
                  recebe no repasse, não no balcão. O parceiro não vê nem controla
                  esta opção.
                </p>
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