// Local: src/pages/DashboardPage.jsx

import React, { useState, useEffect } from 'react';
import AuthService from '../services/authService';
import { Loader2, DollarSign, BarChart3, Users, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// OTIMIZADO: Componente de cartão de KPI mais flexível e estilizado como no novo design
const KpiCard = ({ title, value, icon: Icon, color }) => (
  <div className={`p-6 rounded-lg shadow-lg text-white ${color}`}>
    <div className="flex justify-between items-start">
      <p className="text-lg font-semibold">{title}</p>
      <Icon className="h-8 w-8 opacity-70" />
    </div>
    <p className="text-4xl font-bold mt-2">{value}</p>
  </div>
);

// NOVO: Componente para o gráfico de faturamento
const RevenueChart = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Faturamento Semanal</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="formatted_date" />
        <YAxis />
        <Tooltip formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Receita']} />
        <Legend />
        <Bar dataKey="daily_revenue" name="Receita Diária" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// NOVO: Componente para a lista de pedidos recentes
const RecentOrdersList = ({ orders }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Pedidos Recentes</h3>
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-700">{order.client_name}</p>
            <p className="text-sm text-gray-500">{order.restaurant_name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-800">R$ {order.total_amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500 capitalize">{order.status}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function DashboardPage() {
  // OTIMIZADO: Estados separados para cada tipo de dado
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllDashboardData = async () => {
      try {
        setIsLoading(true);
        // OTIMIZADO: Busca todos os dados em paralelo para maior performance
        const [kpiResult, chartResult, ordersResult] = await Promise.all([
          AuthService.getKpiSummary(),
          AuthService.getRevenueChartData(),
          AuthService.getRecentOrders(),
        ]);
        setKpis(kpiResult);
        setChartData(chartResult);
        setRecentOrders(ordersResult);
      } catch (err) {
        setError(err.message || 'Ocorreu um erro ao buscar os dados do dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllDashboardData();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4 bg-red-100 rounded-lg">Erro ao carregar o dashboard: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Boa tarde, Admin!</h1>
        <p className="text-gray-600">Este é o resumo da sua plataforma em tempo real.</p>
      </div>
      
      {/* OTIMIZADO: Grid para os novos KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Receita Total" value={`R$ ${kpis.totalRevenue.toFixed(2)}`} icon={DollarSign} color="bg-blue-600" />
        <KpiCard title="Pedidos Hoje" value={kpis.ordersToday} icon={BarChart3} color="bg-green-500" />
        <KpiCard title="Ticket Médio" value={`R$ ${kpis.averageTicket.toFixed(2)}`} icon={DollarSign} color="bg-sky-500" />
        <KpiCard title="Novos Clientes Hoje" value={kpis.newClientsToday} icon={Users} color="bg-orange-500" />
      </div>

      {/* NOVO: Layout para o gráfico e a lista de pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>
        <div>
          <RecentOrdersList orders={recentOrders} />
        </div>
      </div>
    </div>
  );
}