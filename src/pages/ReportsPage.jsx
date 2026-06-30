import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import { financeApi } from '../services/finance';
import { getMetrics, getRevenueSeries, getTransactions } from '../services/analytics';
import {
  BarChart2, Download, Loader2, RefreshCcw, TrendingUp, List,
  DollarSign, ShoppingBag, Users, Receipt, XCircle, Clock, Store, Truck,
} from 'lucide-react';
import { NotificationContext } from '../context/NotificationContext';

const TABS = [
  { id: 'metricas',   label: 'Métricas',    icon: BarChart2,   subtitle: 'Indicadores agregados do período' },
  { id: 'receita',    label: 'Receita',     icon: TrendingUp,  subtitle: 'Faturamento por dia' },
  { id: 'transacoes', label: 'Transações',  icon: List,        subtitle: 'Últimos pedidos detalhados' },
];

// Mapeamento de chaves técnicas -> labels amigáveis em PT-BR
const FIELD_LABELS = {
  totalRevenue: 'Receita Total',
  total_revenue: 'Receita Total',
  ordersToday: 'Pedidos no período',
  orders_today: 'Pedidos no período',
  orders_count: 'Total de pedidos',
  averageTicket: 'Ticket Médio',
  average_ticket: 'Ticket Médio',
  newClientsToday: 'Novos Clientes',
  new_clients_today: 'Novos Clientes',
  new_clients: 'Novos Clientes',
  ordersInProgress: 'Em Andamento',
  orders_in_progress: 'Em Andamento',
  ordersCanceled: 'Cancelados',
  orders_canceled: 'Cancelados',
  restaurantsPending: 'Restaurantes Pendentes',
  restaurants_pending: 'Restaurantes Pendentes',
  activeDeliverymen: 'Entregadores Ativos',
  active_deliverymen: 'Entregadores Ativos',
  // Receita por dia
  formatted_date: 'Data',
  daily_revenue: 'Receita do dia',
  total_clients: 'Clientes acumulados',
  // Transações
  id: 'ID',
  created_at: 'Data',
  customer_name: 'Cliente',
  client_name: 'Cliente',
  restaurant_name: 'Restaurante',
  amount: 'Valor',
  total: 'Valor',
  total_amount: 'Valor',
  status: 'Status',
  payment_method: 'Pagamento',
};

// Categorização: campos que são valores monetários
const MONEY_FIELDS = new Set([
  'totalRevenue', 'total_revenue', 'averageTicket', 'average_ticket',
  'daily_revenue', 'amount', 'total', 'total_amount', 'valor',
]);

// Campos que são datas
const DATE_FIELDS = new Set([
  'formatted_date', 'created_at', 'updated_at', 'date', 'data',
]);

// Ícone por chave
const ICON_FOR = {
  totalRevenue: DollarSign,
  total_revenue: DollarSign,
  averageTicket: Receipt,
  average_ticket: Receipt,
  ordersToday: ShoppingBag,
  orders_today: ShoppingBag,
  newClientsToday: Users,
  new_clients_today: Users,
  ordersInProgress: Clock,
  orders_in_progress: Clock,
  ordersCanceled: XCircle,
  orders_canceled: XCircle,
  restaurantsPending: Store,
  restaurants_pending: Store,
  activeDeliverymen: Truck,
  active_deliverymen: Truck,
};

// Cor por categoria de campo
const COLOR_FOR = {
  totalRevenue: 'bg-blue-600',
  total_revenue: 'bg-blue-600',
  averageTicket: 'bg-sky-500',
  average_ticket: 'bg-sky-500',
  ordersToday: 'bg-green-500',
  orders_today: 'bg-green-500',
  newClientsToday: 'bg-orange-500',
  new_clients_today: 'bg-orange-500',
  ordersInProgress: 'bg-purple-600',
  orders_in_progress: 'bg-purple-600',
  ordersCanceled: 'bg-red-500',
  orders_canceled: 'bg-red-500',
  restaurantsPending: 'bg-yellow-500',
  restaurants_pending: 'bg-yellow-500',
  activeDeliverymen: 'bg-green-700',
  active_deliverymen: 'bg-green-700',
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function labelize(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function fmt(val) {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return String(val);
}

function fmtMoney(val) {
  if (val == null || val === '') return '—';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: val.length > 10 ? 'short' : undefined });
  } catch {
    return val;
  }
}

function fmtCell(key, value) {
  if (MONEY_FIELDS.has(key)) return fmtMoney(value);
  if (DATE_FIELDS.has(key)) return fmtDate(value);
  return fmt(value);
}

// Cores pra status comuns
function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const cls =
    s.includes('conclu')   ? 'bg-emerald-100 text-emerald-700' :
    s.includes('cancel')   ? 'bg-red-100 text-red-700' :
    s.includes('andament') ? 'bg-blue-100 text-blue-700' :
    s.includes('pendent')  ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-700';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status || '—'}</span>;
}

function KpiCard({ field, value }) {
  const Icon = ICON_FOR[field] || BarChart2;
  const color = COLOR_FOR[field] || 'bg-slate-600';
  const isMoney = MONEY_FIELDS.has(field);
  return (
    <div className={`p-4 sm:p-5 rounded-xl shadow-sm text-white ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium opacity-95 leading-tight">{labelize(field)}</p>
        <Icon className="w-5 h-5 opacity-80 shrink-0" />
      </div>
      <p className="text-2xl sm:text-3xl font-bold mt-2">
        {isMoney ? fmtMoney(value) : fmt(value)}
      </p>
    </div>
  );
}

function MetricsPanel({ data }) {
  const rows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .filter(([, v]) => typeof v !== 'object' || v === null)
      .filter(([k]) => !k.startsWith('_'));
  }, [data]);

  if (rows.length === 0) {
    return <EmptyState text="Nenhuma métrica disponível para este período." />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {rows.map(([key, value]) => (
        <KpiCard key={key} field={key} value={value} />
      ))}
    </div>
  );
}

function RevenueTable({ data }) {
  const total = useMemo(() => {
    if (!Array.isArray(data)) return 0;
    return data.reduce((sum, r) => sum + Number(r.daily_revenue || 0), 0);
  }, [data]);

  if (!Array.isArray(data) || data.length === 0) {
    return <EmptyState text="Nenhum dado de receita para o período." />;
  }

  const cols = Object.keys(data[0]);

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase opacity-90 tracking-wider">Receita acumulada</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{fmtMoney(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase opacity-90 tracking-wider">Dias com movimento</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{data.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {labelize(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                {cols.map((col) => (
                  <td key={col} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {fmtCell(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionsTable({ data }) {
  const totals = useMemo(() => {
    if (!Array.isArray(data)) return { sum: 0, count: 0 };
    const sum = data.reduce((s, r) => s + Number(r.amount ?? r.total ?? r.total_amount ?? 0), 0);
    return { sum, count: data.length };
  }, [data]);

  if (!Array.isArray(data) || data.length === 0) {
    return <EmptyState text="Nenhuma transação no período." />;
  }

  // Reordena colunas pra ordem mais útil ao ler
  const allCols = Object.keys(data[0]);
  const priorityOrder = ['created_at', 'customer_name', 'client_name', 'restaurant_name', 'amount', 'total', 'total_amount', 'status'];
  const cols = [
    ...priorityOrder.filter((c) => allCols.includes(c)),
    ...allCols.filter((c) => !priorityOrder.includes(c) && c !== 'id'),
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
          <p className="text-xs uppercase opacity-90 tracking-wider">Volume total</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{fmtMoney(totals.sum)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-xl p-4">
          <p className="text-xs uppercase opacity-90 tracking-wider">Transações</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{totals.count}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {cols.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  {labelize(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                {cols.map((col) => (
                  <td key={col} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {col === 'status' ? statusBadge(row[col]) : fmtCell(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-sm text-slate-500">
      <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
      {text}
    </div>
  );
}

export default function ReportsPage() {
  const { notify } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState('metricas');
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      let result;
      if (activeTab === 'metricas') {
        result = await getMetrics(range);
      } else if (activeTab === 'receita') {
        result = await getRevenueSeries(range);
      } else {
        result = await getTransactions({ ...range, limit: 50 });
      }
      setData(result);
    } catch (err) {
      setError(err.message || 'Falha ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [activeTab, range]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleExport() {
    try {
      setDownloading(true);
      const blob = await financeApi.exportReportCSV({ ...range, scope: 'orders' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${range.from}_${range.to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('CSV exportado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      notify('Falha ao exportar CSV.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500 mt-1">
          {activeTabMeta?.subtitle} de <strong>{fmtDate(range.from)}</strong> a <strong>{fmtDate(range.to)}</strong>
        </p>
      </div>

      {/* Toolbar: período + exportar */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Gerando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-full sm:w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium transition flex-1 sm:flex-initial justify-center ${
              activeTab === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="min-h-[12rem]">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-slate-400 bg-white rounded-xl border border-slate-100">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando {activeTabMeta?.label.toLowerCase()}…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <p className="font-semibold mb-1">Falha ao carregar dados</p>
            <p>{error}</p>
            <button
              onClick={loadData}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'metricas' && <MetricsPanel data={data} />}
            {activeTab === 'receita' && <RevenueTable data={data} />}
            {activeTab === 'transacoes' && <TransactionsTable data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
