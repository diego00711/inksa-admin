import React, { useEffect, useMemo, useState } from 'react';
import { financeApi } from '../services/finance';
import DateRangePicker from '../components/DateRangePicker';
import KpiCard from '../components/KpiCard';
import TransactionsTable from '../components/TransactionsTable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, TicketPercent, Clock3, XCircle } from 'lucide-react';

export default function FinanceDashboard() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(from), to: fmt(to) };
  });

  const [metrics, setMetrics] = useState(null);
  const [series, setSeries] = useState([]);
  const [tx, setTx] = useState({ items: [], loading: true });
  const [error, setError] = useState(null);

  const params = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        setError(null);
        const [metricsResponse, seriesResponse] = await Promise.all([
          financeApi.getAdminMetrics(params),
          financeApi.getRevenueSeries(params),
        ]);

        if (cancelled) return;

        setMetrics(metricsResponse && typeof metricsResponse === 'object' ? metricsResponse : null);
        setSeries(Array.isArray(seriesResponse) ? seriesResponse : []);
      } catch (err) {
        console.error('Erro ao carregar métricas financeiras:', err);
        if (cancelled) return;
        setError(err?.message || 'Não foi possível carregar os indicadores financeiros.');
        setMetrics(null);
        setSeries([]);
      }
    }

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setTx((prev) => ({ ...prev, loading: true }));

    async function loadTransactions() {
      try {
        const response = await financeApi.getTransactions({ ...params, limit: 20 });
        if (cancelled) return;

        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
          ? response.items
          : [];

        setTx({ items, loading: false });
      } catch (err) {
        console.error('Erro ao carregar transações:', err);
        if (cancelled) return;
        setTx({ items: [], loading: false });
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Receita Total"
          value={formatBRL(metrics?.total_revenue)}
          icon={<DollarSign size={18} />}
        />
        <KpiCard
          title="Pedidos Hoje"
          value={metrics?.orders_today ?? 0}
          icon={<ShoppingCart size={18} />}
        />
        <KpiCard
          title="Ticket Médio"
          value={formatBRL(metrics?.avg_ticket)}
          icon={<TicketPercent size={18} />}
        />
        <KpiCard
          title="Pedidos em Andamento"
          value={metrics?.orders_in_progress ?? 0}
          icon={<Clock3 size={18} />}
        />
        <KpiCard
          title="Pedidos Cancelados"
          value={metrics?.orders_canceled ?? 0}
          icon={<XCircle size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-600">Faturamento por dia</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-600">Pedidos Recentes</h3>
          <TransactionsTable items={tx.items} loading={tx.loading} />
        </div>
      </div>
    </div>
  );
}

function formatBRL(v) {
  const n = Number(v || 0);
  return `R$ ${n.toFixed(2)}`;
}
