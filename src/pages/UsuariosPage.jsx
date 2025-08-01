// Local: src/pages/UsuariosPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AuthService from '../services/authService'; // Certifique-se de que o caminho para AuthService está correto
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'; // Componentes do Recharts

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

  // Função para buscar usuários da API, memoizada com useCallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true); // Define o estado de carregamento como verdadeiro
    setError(null); // Limpa qualquer erro anterior
    try {
      // Chama o serviço de autenticação, passando o tipo de usuário e o filtro de cidade
      const usersData = await AuthService.getAllUsers(activeTypeFilter, cityFilter);
      setUsers(usersData); // Atualiza o estado dos usuários
    } catch (err) {
      setError(err.message); // Captura e define a mensagem de erro
    } finally {
      setIsLoading(false); // Finaliza o estado de carregamento
    }
  }, [activeTypeFilter, cityFilter]); // Dependências: refaz a função se os filtros mudarem

  // Efeito para buscar usuários quando a função fetchUsers muda (devido a mudanças nos filtros)
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Prepara os dados para o gráfico de pizza, memoizado com useMemo para performance
  const chartData = useMemo(() => {
    const typeCounts = users.reduce((acc, user) => {
      acc[user.user_type] = (acc[user.user_type] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(typeCounts).map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1), // Capitaliza a primeira letra do tipo
      value: typeCounts[key],
      color: COLORS[key] || COLORS.default // Atribui cor baseada no tipo, ou uma cor padrão
    }));
  }, [users]); // Recalcula apenas se a lista de usuários mudar

  // Extrai e ordena cidades únicas para o filtro dropdown, memoizado com useMemo
  const uniqueCities = useMemo(() => {
    const cities = users.map(user => user.city).filter(Boolean); // Pega a propriedade 'city' e filtra valores falsy
    return [...new Set(cities)].sort(); // Garante cidades únicas e as ordena alfabeticamente
  }, [users]); // Recalcula apenas se a lista de usuários mudar

  const filterOptions = ['todos', 'client', 'restaurant', 'delivery', 'admin']; // Opções de filtro por tipo

  return (
    <div>
      {/* Cabeçalho e Botões de Filtro por Tipo */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
        <div className="flex items-center gap-2">
          {filterOptions.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveTypeFilter(filter)} // Atualiza o filtro de tipo
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTypeFilter === filter
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)} {/* Ex: "Todos", "Client" */}
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
          onChange={(e) => setCityFilter(e.target.value)} // Atualiza o filtro de cidade
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
        >
          <option value="">Todas as Cidades</option>
          {uniqueCities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        {cityFilter && ( // Mostra o botão "Limpar" apenas se houver um filtro de cidade ativo
            <button
                onClick={() => setCityFilter('')} // Limpa o filtro de cidade
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
        Total de usuários: <span className="text-gray-900 text-xl">{users.length}</span> {/* Exibe o total de usuários atuais */}
      </div>
      
      {/* Tabela de Usuários */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-gray-500" /></div>
          ) : error ? (
            <div className="text-red-500 text-center p-8">Erro ao carregar usuários: {error}</div>
          ) : (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome Completo</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Tipo</th>
                  <th scope="col" className="px-6 py-3">Cidade</th> {/* Nova coluna para a cidade */}
                  <th scope="col" className="px-6 py-3">Data de Criação</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
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
                    <td className="px-6 py-4">{user.city || 'N/A'}</td> {/* Exibe o valor da cidade */}
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
    </div>
  );
}