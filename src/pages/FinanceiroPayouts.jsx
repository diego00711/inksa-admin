// src/pages/FinanceiroPayouts.jsx
import React, { useState } from 'react';
import { processPayouts } from '../services/payouts';

export default function FinanceiroPayouts() {
  const [loading, setLoading] = useState(false);
  const [partnerType, setPartnerType] = useState('restaurant'); // 'restaurant' | 'delivery'
  const [cycleType, setCycleType] = useState('weekly');         // 'weekly' | 'bi-weekly' | 'monthly'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await processPayouts(partnerType, cycleType);
      if (json?.status === 'error') {
        throw new Error(json?.message || 'Falha ao processar payouts');
      }
      setResult(json);
    } catch (e) {
      setError(e.message || 'Erro inesperado ao processar payouts');
    } finally {
      setLoading(false);
    }
  };

  const PayoutsTable = ({ rows }) => {
    if (!rows?.length) {
      return (
        <div className="text-sm text-gray-600">
          Nenhum payout gerado para os filtros selecionados.
        </div>
      );
    }

    return (
      <div className="overflow-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Parceiro</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Tipo</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Período</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Valor</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-mono">{p.id}</td>
                <td className="px-3 py-2">
                  {p.partner_name || p.partner_id}
                </td>
                <td className="px-3 py-2 capitalize">
                  {p.partner_type}
                </td>
                <td className="px-3 py-2">
                  {p.period_start} — {p.period_end}
                </td>
                <td className="px-3 py-2">
                  R$ {Number(p.amount || 0).toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">
                    {p.status || 'pending'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {p.created_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Payouts</h1>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Parceiro</label>
            <select
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="restaurant">Restaurante</option>
              <option value="delivery">Entregador</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ciclo</label>
            <select
              value={cycleType}
              onChange={(e) => setCycleType(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="weekly">Semanal</option>
              <option value="bi-weekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleProcess}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-4 py-2 disabled:opacity-60"
            >
              {loading ? 'Processando…' : 'Processar agora'}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="text-sm">
              <p><strong>Status:</strong> {result.status}</p>
              <p><strong>Tipo do parceiro:</strong> {result.partner_type}</p>
              <p><strong>Ciclo:</strong> {result.cycle_type}</p>
              <p><strong>Gerados:</strong> {result.generated_count}</p>
            </div>

            <PayoutsTable rows={result.payouts} />

            {/* dump bruto (útil no início para debug) */}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Ver JSON bruto
              </summary>
              <pre className="mt-2 bg-gray-50 border rounded p-3 overflow-auto text-xs">
{JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
