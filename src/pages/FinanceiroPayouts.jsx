// src/pages/FinanceiroPayouts.jsx
import React, { useState } from 'react';
import { processPayouts } from '../services/payouts';
import { useAuth } from '../context/AuthContext'; // caso queira bloquear UI se não autenticado

export default function FinanceiroPayouts() {
  const { user } = useAuth(); // opcional: pode usar para checar role
  const [loading, setLoading] = useState(false);
  const [partnerType, setPartnerType] = useState('restaurant');
  const [cycleType, setCycleType] = useState('weekly');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await processPayouts(partnerType, cycleType);
      setResult(json);
    } catch (e) {
      // se quiser: redirecionar em 401
      // if (e.status === 401) navigate('/login');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {result && (
          <div className="text-sm">
            <p><strong>Status:</strong> {result.status}</p>
            <p><strong>Gerados:</strong> {result.generated_count}</p>
            <pre className="mt-2 bg-gray-50 border rounded p-3 overflow-auto">
              {JSON.stringify(result.payouts, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
