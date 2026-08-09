import React, { useEffect, useMemo, useState } from 'react';
import { financeApi } from '../services/finance';
import DateRangePicker from '../components/DateRangePicker';
import KpiCard from '../components/KpiCard';
import TransactionsTable from '../components/TransactionsTable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, TicketPercent, Clock3, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function FinanceDashboard() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    // Data LOCAL (Brasil), não toISOString (UTC) — senão às 22h de SP o período
    // pula pro dia seguinte e o financeiro fica deslocado.
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: fmt(from), to: fmt(to) };
  });

  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);
  const [series, setSeries] = useState([]);
  const [tx, setTx] = useState({ items: [], loading: true });
  // Quantas linhas de "Pedidos Recentes" mostrar, e um jeito de limpar a lista
  // da tela. Com o volume crescendo, 20 linhas fixas viram uma parede.
  const [txLimit, setTxLimit] = useState(20);
  const [txHidden, setTxHidden] = useState(false);

  const params = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  useEffect(() => {
    let cancelled = false;
    setMetricsLoading(true);
    setMetricsError(null);
    (async () => {
      try {
        const [m, s] = await Promise.all([
          financeApi.getAdminMetrics(params),
          financeApi.getRevenueSeries(params),
        ]);
        if (!cancelled) {
          // O endpoint responde { status, data: { ...kpis } } em camelCase.
          setMetrics(m?.data ?? m ?? null);
          // O backend manda formatted_date/daily_revenue; o gráfico lia
          // date/revenue e por isso não desenhava barra nenhuma.
          setSeries((s?.data || []).map((p) => ({
            date: p.date ?? p.formatted_date ?? '',
            revenue: Number(p.revenue ?? p.daily_revenue ?? 0),
          })));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setMetrics(null);
          setSeries([]);
          setMetricsError(e?.message || 'Erro ao carregar métricas financeiras.');
        }
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setTx((prev) => ({ ...prev, loading: true }));
    setTxHidden(false);
    financeApi.getTransactions({ ...params, limit: txLimit })
      // A tabela lia customer_name/amount/payment_method, que o backend não
      // manda — por isso Cliente vinha "-" e Valor R$ 0,00 em toda linha.
      .then((r) => !cancelled && setTx({
        items: (r?.data || []).map((t) => ({
          ...t,
          customer_name: t.customer_name ?? t.client_name,
          amount: t.amount ?? t.total_amount,
        })),
        loading: false,
      }))
      .catch((e) => {
        console.error(e);
        !cancelled && setTx({ items: [], loading: false });
      });
    return () => { cancelled = true; };
  }, [params, txLimit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Financeiro</h1>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      </div>

      {metricsLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando métricas…
        </div>
      )}

      {metricsError && !metricsLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {metricsError}
        </div>
      )}

      {/* Receita REAL da plataforma = comissão + margem de frete, num único lugar */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Receita real da plataforma</p>
            <p className="text-2xl font-bold text-emerald-800">
              {metricsLoading ? '…' : formatBRL(metrics?.platformRevenue)}
            </p>
            <p className="text-xs text-emerald-700/80 mt-0.5">
              Comissão + margem de frete sobre pedidos concluídos
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-emerald-700/80">Comissão</p>
              <p className="text-lg font-semibold text-emerald-800">
                {metricsLoading ? '…' : formatBRL(metrics?.platformCommission)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700/80">Margem de frete</p>
              <p className="text-lg font-semibold text-emerald-800">
                {metricsLoading ? '…' : formatBRL(metrics?.deliveryMargin)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Receita Total (GMV)"
          value={metricsLoading ? '…' : formatBRL(metrics?.totalRevenue)}
          icon={<DollarSign size={18} />}
        />
        <KpiCard
          title="Pedidos Hoje"
          value={metricsLoading ? '…' : (metrics?.ordersToday ?? 0)}
          icon={<ShoppingCart size={18} />}
        />
        <KpiCard
          title="Ticket Médio"
          value={metricsLoading ? '…' : formatBRL(metrics?.averageTicket)}
          icon={<TicketPercent size={18} />}
        />
        <KpiCard
          title="Pedidos em Andamento"
          value={metricsLoading ? '…' : (metrics?.ordersInProgress ?? 0)}
          icon={<Clock3 size={18} />}
        />
        <KpiCard
          title="Pedidos Cancelados"
          value={metricsLoading ? '…' : (metrics?.ordersCanceled ?? 0)}
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-600">Pedidos Recentes</h3>
            <div className="flex items-center gap-2">
              <select
                value={txLimit}
                onChange={(e) => setTxLimit(Number(e.target.value))}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                title="Quantas linhas mostrar"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} linhas</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTxHidden((v) => !v)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                title="Some com a lista da tela (não apaga nada)"
              >
                {txHidden ? 'Mostrar' : 'Limpar'}
              </button>
            </div>
          </div>
          {txHidden ? (
            <p className="py-6 text-center text-xs text-gray-400">
              Lista oculta — nada foi apagado. Clique em “Mostrar” pra ver de novo.
            </p>
          ) : (
            <TransactionsTable items={tx.items} loading={tx.loading} />
          )}
        </div>
      </div>
    </div>
  );
}

function formatBRL(v) {
  const n = Number(v || 0);
  return `R$ ${n.toFixed(2)}`;
}
