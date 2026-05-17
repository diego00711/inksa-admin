import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import authService from '../services/authService'; // Corrija o import para minúsculo
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PAGE_SIZE = 20;

// Cores para o gráfico (personalizáveis para combinar com seu design)
const COLORS = {
  admin: '#EF4444',     // Tailwind red-500
  restaurant: '#3B82F6', // Tailwind blue-500
  client: '#22C55E',    // Tailwind green-500
  delivery: '#F59E0B',   // Tailwind yellow-500
  default: '#6B7280'    // Tailwind gray-500
};

export function UsuariosPage() {
  const [users, setUsers] = useState([]); // Estado para armazenar os usuários
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar o carregamento
  const [error, setError] = useState(null); // Estado para armazenar erros
  const [activeTypeFilter, setActiveTypeFilter] = useState('todos'); // Filtro por tipo de usuário
  const [cityFilter, setCityFilter] = useState(''); // Novo estado para o filtro por cidade
  const [currentPage, setCurrentPage] = useState(1); // Página atual para paginação client-side

  // Ref para saber se os filtros mudaram e resetar a página
  const prevFiltersRef = useRef({ activeTypeFilter, cityFilter });

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
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: typeCounts[key],
      color: COLORS[key] || COLORS.default
    }));
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
    <div>
      {/* Cabeçalho e Botões de Filtro por Tipo */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
        <div className="flex items-center gap-2">
          {filterOptions.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveTypeFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTypeFilter === filter
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Novo Filtro de Cidade */}
      <div className="mb-6 flex items-center gap-4">
        <label htmlFor="city-filter" className="text-gray-700 font-medium">Filtrar por Cidade:</label>
        <select
          id="city-filter"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
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
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(user => (
                  <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {user.full_name || 'Não disponível'}
                    </td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.user_type === 'admin' ? 'bg-red-100 text-red-800' :
                        user.user_type === 'restaurant' ? 'bg-blue-100 text-blue-800' :
                        user.user_type === 'client' ? 'bg-green-100 text-green-800' :
                        user.user_type === 'delivery' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{user.city || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
