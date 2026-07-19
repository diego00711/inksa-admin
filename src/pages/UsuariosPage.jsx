import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import authService from '../services/authService';
import { Loader2, Users, ShoppingBag, Store, Truck, Shield, MoreVertical, KeyRound, Ban, CheckCircle2, Trash2, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { NotificationContext } from '../context/NotificationContext';

const PAGE_SIZE = 20;

const COLORS = {
  admin: '#EF4444',
  restaurant: '#3B82F6',
  client: '#22C55E',
  delivery: '#F59E0B',
  default: '#6B7280',
};

const TYPE_LABELS = {
  client: 'Cliente',
  restaurant: 'Restaurante',
  delivery: 'Entregador',
  admin: 'Administrador',
};

const TYPE_PILL = {
  admin: 'bg-red-100 text-red-700',
  restaurant: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  delivery: 'bg-amber-100 text-amber-700',
};

export function UsuariosPage() {
  const { notify } = useContext(NotificationContext);
  const [users, setUsers] = useState([]); // Estado para armazenar os usuários
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar o carregamento
  const [error, setError] = useState(null); // Estado para armazenar erros
  const [activeTypeFilter, setActiveTypeFilter] = useState('todos'); // Filtro por tipo de usuário
  const [cityFilter, setCityFilter] = useState(''); // Novo estado para o filtro por cidade
  const [currentPage, setCurrentPage] = useState(1); // Página atual para paginação client-side

  const [openMenuId, setOpenMenuId] = useState(null); // qual menu de ações está aberto
  const [busyUserId, setBusyUserId] = useState(null); // ação em andamento
  const [confirmDelete, setConfirmDelete] = useState(null); // usuário aguardando confirmação de exclusão

  // Ref para saber se os filtros mudaram e resetar a página
  const prevFiltersRef = useRef({ activeTypeFilter, cityFilter });

  // Fecha o menu de ações ao clicar fora
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  // Função para buscar usuários da API, memoizada com useCallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Chama o serviço de autenticação, passando os filtros como objeto
      const usersResp = await authService.getUsers({
        user_type: activeTypeFilter,
        city: cityFilter
      });
      // O backend retorna { status, data }, então pegamos a lista:
      setUsers(usersResp.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTypeFilter, cityFilter]);

  // --- Ações de gestão de usuário ---
  const handleResetPassword = useCallback(async (u) => {
    setOpenMenuId(null);
    setBusyUserId(u.id);
    try {
      const res = await authService.resetUserPassword(u.id);
      notify(res?.message || `E-mail de redefinição enviado para ${u.email}.`, 'success');
    } catch (err) {
      notify(err.message || 'Falha ao enviar redefinição de senha.', 'error');
    } finally {
      setBusyUserId(null);
    }
  }, [notify]);

  const handleToggleStatus = useCallback(async (u) => {
    setOpenMenuId(null);
    const currentlyActive = u.is_active !== false && u.status !== 'inactive';
    const newStatus = currentlyActive ? 'inactive' : 'active';
    setBusyUserId(u.id);
    try {
      await authService.setUserStatus(u.id, newStatus);
      notify(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso.`, 'success');
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: newStatus === 'active' } : x)));
    } catch (err) {
      notify(err.message || 'Falha ao alterar status.', 'error');
    } finally {
      setBusyUserId(null);
    }
  }, [notify]);

  const handleToggleFounding = useCallback(async (u) => {
    setOpenMenuId(null);
    const next = !u.fundador;
    setBusyUserId(u.id);
    try {
      await authService.setUserFounding(u.id, next);
      notify(next
        ? `${u.full_name || u.email} agora é Parceiro Fundador (comissão pela metade).`
        : `Selo de Fundador removido de ${u.full_name || u.email}.`, 'success');
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, fundador: next } : x)));
    } catch (err) {
      notify(err.message || 'Falha ao alterar o selo de Fundador.', 'error');
    } finally {
      setBusyUserId(null);
    }
  }, [notify]);

  const handleDelete = useCallback(async (u) => {
    setConfirmDelete(null);
    setBusyUserId(u.id);
    try {
      await authService.deleteUser(u.id);
      notify(`Usuário ${u.email} excluído.`, 'success');
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      notify(err.message || 'Falha ao excluir usuário.', 'error');
    } finally {
      setBusyUserId(null);
    }
  }, [notify]);

  // Reseta página ao mudar filtros
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.activeTypeFilter !== activeTypeFilter || prev.cityFilter !== cityFilter) {
      setCurrentPage(1);
      prevFiltersRef.current = { activeTypeFilter, cityFilter };
    }
  }, [activeTypeFilter, cityFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Prepara os dados para o gráfico de pizza
  const chartData = useMemo(() => {
    const typeCounts = users.reduce((acc, user) => {
      acc[user.user_type] = (acc[user.user_type] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(typeCounts).map(key => ({
      name: TYPE_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
      value: typeCounts[key],
      color: COLORS[key] || COLORS.default
    }));
  }, [users]);

  // Totais por tipo (sempre considera o universo retornado, nao o filtrado por cidade)
  const totalsByType = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        if (u.user_type === 'client') acc.client++;
        else if (u.user_type === 'restaurant') acc.restaurant++;
        else if (u.user_type === 'delivery') acc.delivery++;
        else if (u.user_type === 'admin') acc.admin++;
        return acc;
      },
      { client: 0, restaurant: 0, delivery: 0, admin: 0 }
    );
  }, [users]);

  // Extrai e ordena cidades únicas para o filtro dropdown
  const uniqueCities = useMemo(() => {
    const cities = users.map(user => user.city).filter(Boolean);
    return [...new Set(cities)].sort();
  }, [users]);

  // Paginação client-side
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage]);

  // Intervalo exibido no rodapé de paginação
  const rangeStart = users.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, users.length);

  const filterOptions = ['todos', 'client', 'restaurant', 'delivery', 'admin'];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Cabeçalho e Botões de Filtro por Tipo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveTypeFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors min-h-[44px] ${
                activeTypeFilter === filter
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter === 'todos' ? 'Todos' : TYPE_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de totais por tipo */}
      {!isLoading && !error && users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="rounded-xl p-4 sm:p-5 text-white shadow-sm bg-green-600">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm font-medium opacity-95">Clientes</p>
              <ShoppingBag className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2">{totalsByType.client}</p>
          </div>
          <div className="rounded-xl p-4 sm:p-5 text-white shadow-sm bg-blue-600">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm font-medium opacity-95">Restaurantes</p>
              <Store className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2">{totalsByType.restaurant}</p>
          </div>
          <div className="rounded-xl p-4 sm:p-5 text-white shadow-sm bg-amber-500">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm font-medium opacity-95">Entregadores</p>
              <Truck className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2">{totalsByType.delivery}</p>
          </div>
          <div className="rounded-xl p-4 sm:p-5 text-white shadow-sm bg-red-500">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm font-medium opacity-95">Administradores</p>
              <Shield className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2">{totalsByType.admin}</p>
          </div>
        </div>
      )}

      {/* Novo Filtro de Cidade */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label htmlFor="city-filter" className="text-gray-700 font-medium">Filtrar por Cidade:</label>
        <select
          id="city-filter"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
        >
          <option value="">Todas as Cidades</option>
          {uniqueCities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        {cityFilter && (
            <button
                onClick={() => setCityFilter('')}
                className="ml-2 px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
            >
                Limpar
            </button>
        )}
      </div>

      {/* Gráfico de Distribuição de Usuários por Tipo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribuição de Usuários por Tipo</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} usuários`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center">Nenhum dado para exibir o gráfico.</p>
        )}
      </div>

      {/* Total de Usuários Filtrados */}
      <div className="mb-4 text-gray-700 font-semibold">
        Total de usuários: <span className="text-gray-900 text-xl">{users.length}</span>
      </div>
      
      {/* Tabela de Usuários */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-gray-500" /></div>
          ) : error ? (
            <div className="text-red-500 text-center p-8">Erro ao carregar usuários: {error}</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="h-12 w-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-sm font-medium">Nenhum usuário encontrado</p>
              <p className="text-xs mt-1">Tente ajustar os filtros aplicados.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome Completo</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Tipo</th>
                  <th scope="col" className="px-6 py-3">Cidade</th>
                  <th scope="col" className="px-6 py-3">Data de Criação</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(user => {
                  const isActive = user.is_active !== false && user.status !== 'inactive';
                  const isBusy = busyUserId === user.id;
                  return (
                  <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {user.full_name || 'Não disponível'}
                    </td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TYPE_PILL[user.user_type] || 'bg-gray-100 text-gray-700'}`}>
                        {TYPE_LABELS[user.user_type] || user.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{user.city || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      {isBusy ? (
                        <Loader2 className="animate-spin h-4 w-4 text-gray-400 inline" />
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === user.id ? null : user.id); }}
                          className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
                          title="Ações"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      )}
                      {openMenuId === user.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-6 top-12 z-20 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 text-left"
                        >
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50"
                          >
                            <KeyRound className="h-4 w-4 text-indigo-500" />
                            Enviar redefinição de senha
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50"
                          >
                            {isActive ? <Ban className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {isActive ? 'Desativar acesso' : 'Ativar acesso'}
                          </button>
                          {user.user_type === 'restaurant' && (
                            <button
                              onClick={() => handleToggleFounding(user)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50"
                            >
                              <Star className={`h-4 w-4 ${user.fundador ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                              {user.fundador ? 'Remover Parceiro Fundador' : 'Tornar Parceiro Fundador'}
                            </button>
                          )}
                          <div className="h-px bg-gray-100 my-1" />
                          <button
                            onClick={() => { setOpenMenuId(null); setConfirmDelete(user); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir usuário
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Controles de paginação */}
      {!isLoading && !error && users.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
          <span className="text-sm text-gray-600">
            Mostrando {rangeStart}–{rangeEnd} de {users.length} usuários
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-sm font-semibold rounded-md bg-gray-800 text-white min-w-[2.5rem] text-center">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Excluir usuário?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Você vai excluir <strong>{confirmDelete.email}</strong> permanentemente.
                  Todos os dados do perfil serão removidos. <strong>Esta ação não pode ser desfeita.</strong>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
