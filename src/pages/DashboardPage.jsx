// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../services/admin';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const json = await getAdminDashboard(); // { status, kpis, chartData, recentOrders }
        setData(json);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Carregando…</div>;
  if (err) return <div className="text-red-600">Erro ao carregar o dashboard: {err}</div>;
  if (!data) return null;

  const { kpis = {}, chartData = [], recentOrders = [] } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card title="Receita Total" value={`R$ ${Number(kpis.totalRevenue || 0).toFixed(2)}`} />
        <Card title="Pedidos Hoje" value={kpis.ordersToday || 0} />
        <Card title="Ticket Médio" value={`R$ ${Number(kpis.averageTicket || 0).toFixed(2)}`} />
        <Card title="Novos Clientes Hoje" value={kpis.newClientsToday || 0} />
        <Card title="Clientes" value={kpis.totalClients || 0} />
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Faturamento Semanal</h2>
        <div className="text-sm text-gray-600">
          {chartData.length === 0 ? 'Sem dados' : (
            <ul className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {chartData.map((d) => (
                <li key={d.formatted_date} className="flex justify-between border rounded px-2 py-1">
                  <span>{d.formatted_date}</span>
                  <span>R$ {Number(d.daily_revenue || 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Pedidos Recentes</h2>
        {recentOrders.length === 0 ? (
          <div className="text-sm text-gray-600">Nenhum pedido recente.</div>
        ) : (
          <ul className="space-y-2">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex justify-between border rounded px-3 py-2 text-sm">
                <span className="font-mono">{o.id}</span>
                <span>{o.restaurant_name || '-'}</span>
                <span>{o.client_name || '-'}</span>
                <span>R$ {Number(o.total_amount || 0).toFixed(2)}</span>
                <span>{o.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
