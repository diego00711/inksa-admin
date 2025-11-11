import React, { useState, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/authService'; // Corrija o import para minúsculo
import { AlertCircle, Loader2, Trophy, Zap } from 'lucide-react';
import {
  fetchGamificationLeaderboard,
  fetchGamificationOverview,
} from '../services/evaluations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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
  const [gamificationLoading, setGamificationLoading] = useState(false);
  const [gamificationError, setGamificationError] = useState(null);
  const [customerGamification, setCustomerGamification] = useState(createEmptyGamification());
  const [courierGamification, setCourierGamification] = useState(createEmptyGamification());
  const [customerLeaders, setCustomerLeaders] = useState([]);
  const [courierLeaders, setCourierLeaders] = useState([]);

  // Função para buscar usuários da API, memoizada com useCallback
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.getUsers({
        user_type: activeTypeFilter,
        city: cityFilter,
      });

      const normalized = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.results)
        ? response.results
        : [];

      setUsers(normalized);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError(err?.message || 'Não foi possível carregar os usuários.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTypeFilter, cityFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const loadGamification = useCallback(async () => {
    setGamificationLoading(true);
    setGamificationError(null);

    try {
      const [customerOverview, courierOverview, customerBoard, courierBoard] = await Promise.all([
        fetchGamificationOverview({ scope: 'customer' }),
        fetchGamificationOverview({ scope: 'delivery' }),
        fetchGamificationLeaderboard({ scope: 'customer', limit: 5 }),
        fetchGamificationLeaderboard({ scope: 'delivery', limit: 5 }),
      ]);

      setCustomerGamification(normalizeGamificationOverview(customerOverview));
      setCourierGamification(normalizeGamificationOverview(courierOverview));
      setCustomerLeaders(normalizeGamificationLeaderboard(customerBoard));
      setCourierLeaders(normalizeGamificationLeaderboard(courierBoard));
    } catch (err) {
      console.error('Erro ao carregar gamificação de usuários:', err);
      setGamificationError(err?.message || 'Não foi possível carregar os dados de gamificação.');
      setCustomerLeaders([]);
      setCourierLeaders([]);
    } finally {
      setGamificationLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGamification();
  }, [loadGamification]);

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

      {gamificationError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">{gamificationError}</span>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <GamificationCard
          title="Clientes"
          summary={customerGamification}
          leaders={customerLeaders}
          loading={gamificationLoading}
          onRefresh={loadGamification}
          accent="emerald"
        />
        <GamificationCard
          title="Entregadores"
          summary={courierGamification}
          leaders={courierLeaders}
          loading={gamificationLoading}
          onRefresh={loadGamification}
          accent="amber"
        />
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
    </div>
  );
}

function GamificationCard({ title, summary, leaders, loading, onRefresh, accent }) {
  const accentClasses = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Gamificação – {title}</h2>
          <p className="text-sm text-gray-500">Desempenho e ranking dos {title.toLowerCase()} na plataforma.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <GamificationStat label="Participantes ativos" value={formatNumber(summary.participants)} />
        <GamificationStat
          label="XP total acumulado"
          value={`${formatNumber(summary.totalXp)} XP`}
          icon={Zap}
          className={accentClasses[accent]}
        />
        <GamificationStat label="Nível médio" value={formatAverageLevel(summary.averageLevel)} />
        <GamificationStat label="Atualizado em" value={formatDateTime(summary.updatedAt)} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-700">Top 5 {title.toLowerCase()}</h3>
        {leaders.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">Nenhum participante ranqueado neste período.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {leaders.map((leader, index) => (
              <li key={leader.id || leader.email || `${title}-${index}`} className="flex items-center justify-between py-2 text-sm text-gray-700">
                <div>
                  <p className="font-medium text-gray-900">
                    {index + 1}. {leader.name}
                  </p>
                  {leader.city && <p className="text-xs text-gray-500">{leader.city}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-indigo-600">{formatNumber(leader.xp)} XP</p>
                  {leader.level && <p className="text-xs text-gray-500">Nível {leader.level}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function GamificationStat({ label, value, icon: Icon, className }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${className ?? 'border-gray-200 bg-gray-50 text-gray-700'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
        <span>{value ?? '—'}</span>
      </div>
    </div>
  );
}

function createEmptyGamification() {
  return {
    participants: 0,
    totalXp: 0,
    averageLevel: 0,
    updatedAt: null,
  };
}

function normalizeGamificationOverview(raw) {
  const payload =
    raw?.overview ??
    raw?.data?.overview ??
    raw?.data ??
    raw ?? {};

  return {
    participants:
      Number(
        payload.participants ??
          payload.total_participants ??
          payload.active_participants ??
          payload.totalParticipants ??
          0
      ) || 0,
    totalXp:
      Number(payload.totalXp ?? payload.total_xp ?? payload.xp ?? payload.total_points ?? 0) || 0,
    averageLevel:
      Number(payload.average_level ?? payload.avg_level ?? payload.mean_level ?? payload.level_avg ?? 0) || 0,
    updatedAt: payload.updated_at ?? payload.last_sync ?? payload.generated_at ?? payload.refreshed_at ?? null,
  };
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function normalizeGamificationLeaderboard(raw) {
  const collection = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.leaders)
    ? raw.leaders
    : Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.results)
    ? raw.results
    : [];

  return collection
    .map((entry) => ({
      id:
        entry.id ??
        entry.user_id ??
        entry.participant_id ??
        entry.uuid ??
        entry.email ??
        entry.slug ??
        null,
      name:
        pickFirstNonEmpty(
          entry.name,
          entry.display_name,
          entry.full_name,
          entry.nickname,
          entry.first_name && entry.last_name
            ? `${entry.first_name} ${entry.last_name}`
            : undefined,
          entry.first_name,
          'Participante'
        ),
      xp: Number(entry.xp ?? entry.points ?? entry.total_xp ?? entry.score ?? 0) || 0,
      level: entry.level ?? entry.tier ?? entry.rank ?? null,
      city: entry.city ?? entry.location ?? entry.address_city ?? null,
    }))
    .filter((entry) => entry.id || entry.name);
}

function formatNumber(value) {
  if (value === undefined || value === null) return '—';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '—';
  return new Intl.NumberFormat('pt-BR').format(numeric);
}

function formatAverageLevel(value) {
  if (value === undefined || value === null) return '—';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '—';
  return numeric.toFixed(1);
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
