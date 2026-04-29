import React, { useCallback, useEffect, useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import { financeApi } from '../services/finance';
import { getMetrics, getRevenueSeries, getTransactions } from '../services/analytics';
import { BarChart2, Download, Loader2, RefreshCcw, TrendingUp, List } from 'lucide-react';

const TABS = [
  { id: 'metricas', label: 'Métricas', icon: BarChart2 },
  { id: 'receita', label: 'Receita', icon: TrendingUp },
  { id: 'transacoes', label: 'Transações', icon: List },
];

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function fmt(val) {
  if (val == null) return '—';
  if (typeof val === 'number') {
    return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
  return String(val);
}

function fmtMoney(val) {
  if (val == null) return '—';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('pt-BR');
  } catch {
    return val;
  }
}

function MetricsPanel({ data }) {
  if (!data) return null;
  const rows = Object.entries(data).filter(([, v]) => typeof v !== 'object' || v === null);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {key.replace(/_/g, ' ')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">
            {typeof value === 'number' && key.toLowerCase().includes('receita')
              ? fmtMoney(value)
              : fmt(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function RevenueTable({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum dado de receita encontrado para o período.</p>;
  }
  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {cols.map((col) => (
              <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              {cols.map((col) => (
                <td key={col} className="px-5 py-3 text-slate-700">
                  {col.toLowerCase().includes('data') || col.toLowerCase().includes('date')
                    ? fmtDate(row[col])
                    : col.toLowerCase().includes('valor') ||
                      col.toLowerCase().includes('receita') ||
                      col.toLowerCase().includes('total') ||
                      col.toLowerCase().includes('amount')
                    ? fmtMoney(row[col])
                    : fmt(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-slate-500">Nenhuma transação encontrada para o período.</p>;
  }
  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {cols.map((col) => (
              <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              {cols.map((col) => (
                <td key={col} className="px-5 py-3 text-slate-700">
                  {col.toLowerCase().includes('data') || col.toLowerCase().includes('date') || col.toLowerCase().includes('_at')
                    ? fmtDate(row[col])
                    : col.toLowerCase().includes('valor') ||
                      col.toLowerCase().includes('amount') ||
                      col.toLowerCase().includes('total')
                    ? fmtMoney(row[col])
                    : fmt(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    } catch (e) {
      console.error(e);
      alert('Falha ao exportar CSV. Verifique se o endpoint /api/admin/reports/export está disponível.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
          <button
            onClick={handleExport}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Gerando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[12rem]">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
            <p className="font-semibold mb-1">Falha ao carregar dados</p>
            <p>{error}</p>
            <button
              onClick={loadData}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
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
