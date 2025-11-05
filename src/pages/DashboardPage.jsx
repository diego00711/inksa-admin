import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, BarChart3, Users, Clock, XOctagon, Store, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getMetrics, getRevenueSeries, getTransactions } from '../services/analytics';

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
        <span className="cursor-pointer text-white bg-black/20 px-2 rounded-full" title={tooltip}>?</span>
      </div>
    )}
  </div>
);

// Gráfico de faturamento
const RevenueChart = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg h-full flex flex-col">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Faturamento (período)</h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="formatted_date" />
        <YAxis />
        <Tooltip formatter={(value) => [`R$ ${Number(value ?? 0).toFixed(2)}`, 'Receita']} />
        <Legend />
        <Bar dataKey="daily_revenue" name="Receita Diária" fill={COLORS.blue} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// Pizza status pedidos
const OrdersStatusPie = ({ data }) => {
  const statusColors = {
    pendente: COLORS.orange,
    concluido: COLORS.green,
    cancelado: COLORS.red,
    em_andamento: COLORS.blue,
    aguardando: COLORS.purple,
    entregue: COLORS.sky
  };

  const entries = Object.entries(data || {});
  if (!entries.length) return null;

  const chartData = entries.map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: Number(count || 0),
    color: statusColors[status] || COLORS.gray
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg h-full flex flex-col">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Pedidos por Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={chartData} innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label>
            {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value) => [`${value} pedidos`, 'Total']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Linha crescimento de clientes
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

// Lista de pedidos recentes
const RecentOrdersList = ({ orders }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg h-full">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Pedidos Recentes</h3>
    {orders?.length ? (
      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-700">{o.client_name || '-'}</p>
              <p className="text-sm text-gray-500">{o.restaurant_name || '-'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-800">R$ {Number(o.total_amount ?? o.amount ?? o.total ?? 0).toFixed(2)}</p>
              <p className="text-sm text-gray-500 capitalize">{o.status || '-'}</p>
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
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState({});
  const [clientsGrowth, setClientsGrowth] = useState([]);
  const [period, setPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const makeRange = (p) => {
    const end = new Date();
    const start = new Date();
    if (p === 'month') start.setMonth(end.getMonth() - 1);
    else start.setDate(end.getDate() - 7);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(start), to: fmt(end) };
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { from, to } = makeRange(period);

        const [m, s, t] = await Promise.all([
          getMetrics({ from, to }),
          getRevenueSeries({ from, to }),
          getTransactions({ from, to, limit: 20 }),
        ]);

        if (!mounted) return;

        // --- KPIs ---
        const mkpis = m?.kpis || m || {};
        // normaliza nomes possíveis
        const k = {
          totalRevenue: Number(mkpis.totalRevenue ?? mkpis.total_revenue ?? 0),
          ordersToday: Number(mkpis.ordersToday ?? mkpis.orders_today ?? 0),
          averageTicket: Number(mkpis.averageTicket ?? mkpis.avg_ticket ?? 0),
          newClientsToday: Number(mkpis.newClientsToday ?? mkpis.new_clients_today ?? 0),

          ordersInProgress: Number(mkpis.ordersInProgress ?? mkpis.orders_in_progress ?? 0),
          ordersCanceled: Number(mkpis.ordersCanceled ?? mkpis.orders_canceled ?? 0),
          restaurantsPending: Number(mkpis.restaurantsPending ?? mkpis.restaurants_pending ?? 0),
          activeDeliverymen: Number(mkpis.activeDeliverymen ?? mkpis.active_deliverymen ?? 0),
        };
        setKpis(k);

        // --- Série de receita e crescimento de clientes ---
        const sItems = s?.items || s || [];
        const normSeries = sItems.map((row) => ({
          formatted_date: row.formatted_date || row.date || row.day,
          daily_revenue: Number(row.daily_revenue ?? row.revenue ?? row.value ?? 0),
          total_clients: Number(row.total_clients ?? 0),
        }));
        setChartData(normSeries);
        // crescimento de clientes: reaproveita a mesma série (separada para seu componente)
        setClientsGrowth(
          normSeries.map((r) => ({ formatted_date: r.formatted_date, total_clients: r.total_clients }))
        );

        // --- Pedidos por status ---
        const statusMap = mkpis.ordersStatus || mkpis.orders_status || {};
        setOrdersStatus(statusMap);

        // --- Pedidos recentes / transações ---
        const tItems = t?.items || t || [];
        setRecentOrders(
          tItems.map((it) => ({
            id: it.id,
            client_name: it.customer_name ?? it.client_name ?? '-',
            restaurant_name: it.restaurant_name ?? '-',
            total_amount: Number(it.amount ?? it.total ?? 0),
            status: it.status ?? '-',
            created_at: it.created_at,
          }))
        );

      } catch (err) {
        console.error(err);
        setError(err?.message || 'Ocorreu um erro ao buscar os dados do dashboard.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
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

  const extraKpis = [
    { title: "Pedidos em Andamento", value: kpis.ordersInProgress ?? '-', icon: Clock, color: "bg-purple-600", tooltip: "Pedidos em andamento" },
    { title: "Pedidos Cancelados", value: kpis.ordersCanceled ?? '-', icon: XOctagon, color: "bg-red-500", tooltip: "Pedidos cancelados no período" },
    { title: "Restaurantes Pendentes", value: kpis.restaurantsPending ?? '-', icon: Store, color: "bg-yellow-500", tooltip: "Restaurantes aguardando aprovação" },
    { title: "Entregadores Ativos", value: kpis.activeDeliverymen ?? '-', icon: Truck, color: "bg-green-700", tooltip: "Entregadores ativos" },
  ];

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
        <KpiCard title="Receita Total" value={`R$ ${Number(kpis.totalRevenue ?? 0).toFixed(2)}`} icon={DollarSign} color="bg-blue-600" />
        <KpiCard title="Pedidos Hoje" value={kpis.ordersToday ?? '-'} icon={BarChart3} color="bg-green-500" />
        <KpiCard title="Ticket Médio" value={`R$ ${Number(kpis.averageTicket ?? 0).toFixed(2)}`} icon={DollarSign} color="bg-sky-500" />
        <KpiCard title="Novos Clientes Hoje" value={kpis.newClientsToday ?? '-'} icon={Users} color="bg-orange-500" />
      </div>

      {/* KPIs extras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {extraKpis.map((kpi) => (<KpiCard key={kpi.title} {...kpi} />))}
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
