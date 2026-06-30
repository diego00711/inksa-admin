import React, { useState, useEffect, useCallback } from 'react';
import { Users, ShoppingBag, Store, Truck, Shield, Activity, UserPlus, Clock, Loader2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';

const TYPE_LABEL = {
  client: 'Cliente',
  restaurant: 'Restaurante',
  delivery: 'Entregador',
  admin: 'Administrador',
};

const TYPE_COLOR = {
  client: 'bg-orange-500',
  restaurant: 'bg-green-600',
  delivery: 'bg-blue-600',
  admin: 'bg-purple-600',
};

function Card({ title, value, icon: Icon, color = 'bg-indigo-600', sub }) {
  return (
    <div className={`rounded-xl p-4 sm:p-5 text-white shadow-md ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold opacity-90">{title}</div>
        <Icon className="w-5 h-5 opacity-80" />
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {sub && <div className="text-xs opacity-80 mt-1">{sub}</div>}
    </div>
  );
}

function Pill({ tipo }) {
  const cls = {
    client: 'bg-orange-100 text-orange-700',
    restaurant: 'bg-green-100 text-green-700',
    delivery: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
  }[tipo] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {TYPE_LABEL[tipo] || tipo || '—'}
    </span>
  );
}

export default function UserMetricsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = authService.getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/user-metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || json);
    } catch (e) {
      setError(e.message || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(false);
    const interval = setInterval(() => fetchMetrics(true), 60000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Erro: {error}
        </div>
        <button onClick={() => fetchMetrics(false)} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
          Tentar de novo
        </button>
      </div>
    );
  }

  const t = data?.totals || {};
  const serie = (data?.registros_por_dia || []).map((d) => ({ ...d, qtd: Number(d.qtd || 0) }));
  const recentes = data?.cadastros_recentes || [];

  const fmtDate = (s) => {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usuários & Métricas</h1>
          <p className="text-sm text-gray-500">Atualiza automaticamente a cada 1 min.</p>
        </div>
        <button
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar agora
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card title="Total de usuários" value={t.total ?? 0} icon={Users} color="bg-indigo-600" />
        <Card title="Online agora" value={t.online_agora ?? 0} icon={Activity} color="bg-green-600" sub="Login nos últimos 15 min" />
        <Card title="Ativos hoje" value={t.ativos_24h ?? 0} icon={Clock} color="bg-orange-500" sub="Login nas últimas 24h" />
        <Card title="Novos esta semana" value={t.novos_7d ?? 0} icon={UserPlus} color="bg-blue-600" sub="Cadastros últimos 7 dias" />
      </div>

      {/* Cards por tipo */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Por tipo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card title="Clientes" value={t.clientes ?? 0} icon={ShoppingBag} color={TYPE_COLOR.client} />
          <Card title="Restaurantes" value={t.restaurantes ?? 0} icon={Store} color={TYPE_COLOR.restaurant} />
          <Card title="Entregadores" value={t.entregadores ?? 0} icon={Truck} color={TYPE_COLOR.delivery} />
          <Card title="Administradores" value={t.admins ?? 0} icon={Shield} color={TYPE_COLOR.admin} />
        </div>
      </div>

      {/* Gráfico de cadastros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Novos cadastros por dia (últimos 14 dias)</h2>
        {serie.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sem cadastros nesse período ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="rotulo" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} cadastros`, 'Total']} labelFormatter={(l) => `Dia ${l}`} />
              <Bar dataKey="qtd" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cadastros recentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-700">Últimos 10 cadastros</h2>
        </div>
        {recentes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 px-4">Sem cadastros ainda.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentes.map((u) => (
              <div key={u.email} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{u.email}</div>
                    <div className="text-xs text-gray-500">
                      Cadastrou em {fmtDate(u.criado_em)} {u.ultimo_login && `• último login ${fmtDate(u.ultimo_login)}`}
                    </div>
                  </div>
                </div>
                <Pill tipo={u.tipo} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
