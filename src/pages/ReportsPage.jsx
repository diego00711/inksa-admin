import React, { useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import { financeApi } from '../services/finance';

export default function ReportsPage() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(from), to: fmt(to) };
  });
  const [downloading, setDownloading] = useState(false);

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
      alert('Falha ao exportar CSV');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-medium text-gray-700">Exportar pedidos</h3>
        <p className="mt-1 text-sm text-gray-500">
          Gera CSV com pedidos, valores, taxas, restaurante, entregador, status e datas.
        </p>
        <div className="mt-3">
          <button
            onClick={handleExport}
            disabled={downloading}
            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {downloading ? 'Gerando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
