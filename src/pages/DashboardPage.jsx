import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { Loader2, DollarSign, BarChart3, Users, Clock, XOctagon, Store, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// Cores extras para gráficos e KPIs
const COLORS = {
  blue: "#2563eb",
  green: "#22C55E",
  orange: "#F59E0B",
  red: "#EF4444",
  sky: "#0ea5e9",
  gray: "#64748b",
  purple: "#8b5cf6",
  yellow: "#fde047"
};

// KPI Card mais versátil
const KpiCard = ({ title, value, icon: Icon, color, tooltip }) => (
  <div className={`p-6 rounded-lg shadow-lg text-white relative ${color}`}>
    <div className="flex justify-between items-start">
      <p className="text-lg font-semibold">{title}</p>
      <Icon className="h-8 w-8 opacity-80" />
    </div>
    <p className="text-4xl font-bold mt-2">{value}</p>
    {tooltip && (
      <div className="absolute top-2 right-2 group">
        <span className="cursor-pointer text-white bg-black bg-opacity-20 px-2 rounded-full" title={tooltip}>?</span>
      </div>
    )}
  </div>
);

// Gráfico de faturamento
const RevenueChart = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg h-full flex flex-col">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Faturamento Semanal</h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="formatted_date" />
        <YAxis />
        <Tooltip formatter={(value) => [`R$ ${value?.toFixed(2) ?? 0}`, 'Receita']} />
        <Legend />
        <Bar dataKey="daily_revenue" name="Receita Diária" fill={COLORS.blue} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// NOVO: Gráfico pizza de status dos pedidos
const OrdersStatusPie = ({ data }) => {
  const statusColors = {
    pendente: COLORS.orange,
    concluido: COLORS.green,
    cancelado: COLORS.red,
    em_andamento: COLORS.blue,
    aguardando: COLORS.purple,
    entregue: COLORS.sky
  };

  const chartData = Object.entries(data || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: statusColors[status] || COLORS.gray
  }));

  if (!chartData.length) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg h-full flex flex-col">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Pedidos por Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={50}
            outerRadius={90}
            dataKey="value"
            nameKey="name"
            label
          >
            {chartData.map((entry, idx) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} pedidos`, 'Total']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// NOVO: Gráfico linha crescimento de clientes
const ClientsLineChart = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg h-full flex flex-col">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Crescimento de Clientes</h3>
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="formatted_date" />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value) => [`${value} clientes`, 'Clientes']} />
        <Legend />
        <Line type="monotone" dataKey="total_clients" name="Clientes" stroke={COLORS.green} strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// Listagem de pedidos recentes
const RecentOrdersList = ({ orders }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg h-full">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Pedidos Recentes</h3>
    {orders?.length ? (
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-700">{order.client_name}</p>
              <p className="text-sm text-gray-500">{order.restaurant_name}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-800">R$ {order.total_amount?.toFixed(2)}</p>
              <p className="text-sm text-gray-500 capitalize">{order.status}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500">Nenhum pedido recente.</p>
    )}
  </div>
);

export function DashboardPage() {
  // Estados de dados
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState({});
  const [clientsGrowth, setClientsGrowth] = useState([]);
  const [period, setPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Busca todos os dados do dashboard, com filtro de período
  useEffect(() => {
    const fetchAllDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Supondo que o backend aceite ?period=week|month
        const dashboardResult = await authService.getDashboardStats({ period });
        setKpis(dashboardResult.kpis);
        setChartData(dashboardResult.chartData);
        setRecentOrders(dashboardResult.recentOrders);
        setOrdersStatus(dashboardResult.ordersStatus);
        setClientsGrowth(dashboardResult.clientsGrowth);
      } catch (err) {
        setError(err.message || 'Ocorreu um erro ao buscar os dados do dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllDashboardData();
  }, [period]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4 bg-red-100 rounded-lg">Erro ao carregar o dashboard: {error}</div>;
  }

  if (!kpis) {
    return <div className="text-gray-500 text-center p-4">Carregando dados...</div>;
  }

  // KPIs adicionais
  const extraKpis = [
    {
      title: "Pedidos em Andamento",
      value: kpis.ordersInProgress ?? '-',
      icon: Clock,
      color: "bg-purple-600",
      tooltip: "Pedidos atualmente em andamento na plataforma"
    },
    {
      title: "Pedidos Cancelados",
      value: kpis.ordersCanceled ?? '-',
      icon: XOctagon,
      color: "bg-red-500",
      tooltip: "Pedidos cancelados no período selecionado"
    },
    {
      title: "Restaurantes Pendentes",
      value: kpis.restaurantsPending ?? '-',
      icon: Store,
      color: "bg-yellow-500",
      tooltip: "Restaurantes aguardando aprovação"
    },
    {
      title: "Entregadores Ativos",
      value: kpis.activeDeliverymen ?? '-',
      icon: Truck,
      color: "bg-green-700",
      tooltip: "Quantidade de entregadores ativos"
    }
  ];

  // Filtro de período
  const periodOptions = [
    { value: "week", label: "Esta Semana" },
    { value: "month", label: "Este Mês" }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Boa tarde, Admin!</h1>
        <p className="text-gray-600">Este é o resumo da sua plataforma em tempo real.</p>
      </div>

      {/* Filtro de período */}
      <div className="mb-2 flex flex-wrap gap-3">
        {periodOptions.map(opt => (
          <button
            key={opt.value}
            className={`px-4 py-2 rounded-full font-semibold transition-colors border ${period === opt.value ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Receita Total" value={`R$ ${kpis.totalRevenue?.toFixed(2) ?? '-'}`} icon={DollarSign} color="bg-blue-600" />
        <KpiCard title="Pedidos Hoje" value={kpis.ordersToday ?? '-'} icon={BarChart3} color="bg-green-500" />
        <KpiCard title="Ticket Médio" value={`R$ ${kpis.averageTicket?.toFixed(2) ?? '-'}`} icon={DollarSign} color="bg-sky-500" />
        <KpiCard title="Novos Clientes Hoje" value={kpis.newClientsToday ?? '-'} icon={Users} color="bg-orange-500" />
      </div>

      {/* KPIs extras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {extraKpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Gráficos e listas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <RevenueChart data={chartData} />
          <ClientsLineChart data={clientsGrowth} />
        </div>
        <div className="space-y-8">
          <OrdersStatusPie data={ordersStatus} />
          <RecentOrdersList orders={recentOrders} />
        </div>
      </div>
    </div>
  );
}
