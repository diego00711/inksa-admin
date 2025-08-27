import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  AlertTriangle, 
  FileText,
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import financeService from '../services/financeService';

export default function FinanceDashboard() {
  const [overview, setOverview] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [subscriptionsData, setSubscriptionsData] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, revenueRes, subscriptionsRes, paymentsRes] = await Promise.all([
        financeService.getFinanceOverview(),
        financeService.getRevenueData('30d'),
        financeService.getSubscriptionsData('30d'),
        financeService.getRecentPayments(10)
      ]);

      setOverview(overviewRes);
      setRevenueData(revenueRes);
      setSubscriptionsData(subscriptionsRes);
      setRecentPayments(paymentsRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // KPI Cards Component
  const KPICard = ({ title, value, icon: Icon, color, trend, tooltip }) => (
    <div className={`${color} text-white p-6 rounded-lg shadow-lg relative overflow-hidden`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">{Math.abs(trend)}% vs mês anterior</span>
            </div>
          )}
        </div>
        <Icon className="h-8 w-8 opacity-80" />
      </div>
      {tooltip && (
        <div className="absolute top-2 right-2">
          <span className="cursor-pointer text-white bg-black bg-opacity-20 px-2 rounded-full text-xs" title={tooltip}>
            ?
          </span>
        </div>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Receita (30 dias)",
      value: formatCurrency(overview.receita_30d),
      icon: DollarSign,
      color: "bg-green-600",
      trend: 12.5,
      tooltip: "Total de receita dos últimos 30 dias"
    },
    {
      title: "MRR",
      value: formatCurrency(overview.mrr),
      icon: TrendingUp,
      color: "bg-blue-600",
      trend: 8.3,
      tooltip: "Monthly Recurring Revenue - Receita mensal recorrente"
    },
    {
      title: "Inadimplência",
      value: `${(overview.inadimplencia_pct || 0).toFixed(1)}%`,
      icon: AlertTriangle,
      color: "bg-red-500",
      trend: -2.1,
      tooltip: "Percentual de faturas vencidas"
    },
    {
      title: "Pagamentos Hoje",
      value: overview.pagamentos_hoje || 0,
      icon: CreditCard,
      color: "bg-purple-600",
      tooltip: "Pagamentos processados hoje"
    },
    {
      title: "Faturas Abertas",
      value: overview.faturas_abertas || 0,
      icon: FileText,
      color: "bg-orange-500",
      tooltip: "Faturas aguardando pagamento"
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(overview.ticket_medio),
      icon: BarChart3,
      color: "bg-indigo-600",
      tooltip: "Valor médio por transação"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Financeiro</h1>
          <p className="text-gray-600">Visão geral da situação financeira da plataforma</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/financeiro/faturas"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Faturas
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando dados financeiros...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpiCards.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Receita Diária (30 dias)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Receita']}
                    labelFormatter={(label) => `Data: ${formatDate(label)}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Subscriptions Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Assinaturas (30 dias)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={subscriptionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => `Data: ${formatDate(label)}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="new" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Novas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="canceled" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Canceladas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Payments Table */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Pagamentos Recentes</h3>
                <Link
                  to="/financeiro/faturas"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver todos →
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Transação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentPayments.slice(0, 10).map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.cliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          {payment.metodo}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(payment.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {payment.transacao}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
