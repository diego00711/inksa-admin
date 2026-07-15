// src/pages/TvPage.jsx
// Painel de parede do escritorio (rota /tv). Fica aberto 24/7 numa TV.
//
// Premissas de projeto:
//  - NUNCA deslogar por falha temporaria: erro de rede/backend hibernando so
//    mostra "reconectando" e tenta de novo (o apiClient renova a sessao).
//  - Legivel de longe: fundo escuro, numeros gigantes, zero menu.
//  - Mantem os ultimos dados na tela enquanto reconecta (nao pisca zerado).
import { useEffect, useState, useCallback, useRef } from 'react';
import authService from '../services/authService';

const POLL_MS = 30000;

const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABELS = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  preparing: 'Em preparo',
  ready: 'Pronto',
  on_the_way: 'A caminho',
  in_progress: 'Em andamento',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
};

function Card({ label, value, sub, accent = false, big = false }) {
  return (
    <div
      className={`rounded-2xl p-6 flex flex-col justify-between ${
        accent ? 'bg-orange-600' : 'bg-gray-800'
      }`}
    >
      <span className={`text-lg font-semibold ${accent ? 'text-orange-100' : 'text-gray-400'}`}>
        {label}
      </span>
      <span
        className={`font-black tracking-tight text-white ${big ? 'text-7xl' : 'text-5xl'} mt-2`}
      >
        {value}
      </span>
      {sub && (
        <span className={`text-base mt-1 ${accent ? 'text-orange-100' : 'text-gray-500'}`}>
          {sub}
        </span>
      )}
    </div>
  );
}

export default function TvPage() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [clock, setClock] = useState(new Date());
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await authService.getTvStats();
      if (!mounted.current) return;
      if (res?.data) {
        setData(res.data);
        setUpdatedAt(new Date());
        setOffline(false);
      }
    } catch {
      // Rede fora / backend acordando: mantem os dados antigos na tela.
      // NAO desloga — o apiClient so encerra a sessao se ela for invalida.
      if (mounted.current) setOffline(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => {
      mounted.current = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const d = data || {};
  const orders = d.recentOrders || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Cabecalho */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-baseline gap-4">
          <span className="text-5xl font-black text-orange-500">inksa</span>
          <span className="text-xl text-gray-500">Painel do escritório</span>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black tabular-nums">
            {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-base mt-1">
            {offline ? (
              <span className="text-amber-400">● Reconectando…</span>
            ) : (
              <span className="text-green-400">
                ● Ao vivo
                {updatedAt &&
                  ` · ${updatedAt.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Numeros principais */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <Card label="Pedidos hoje" value={d.ordersToday ?? '—'} big />
        <Card label="Em andamento" value={d.ordersInProgress ?? '—'} big />
        <Card label="Faturamento hoje" value={brl(d.revenueToday)} />
        <Card
          label="Sua receita hoje"
          value={brl(d.platformRevenueToday)}
          sub="comissão + margem do frete"
          accent
        />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        <Card label="Entregadores online" value={d.deliverymenOnline ?? '—'} />
        <Card label="Restaurantes abertos" value={d.restaurantsOpen ?? '—'} />
        <Card label="Faturamento total" value={brl(d.revenueTotal)} sub="desde o início" />
        <Card label="Sua receita total" value={brl(d.platformRevenueTotal)} sub="desde o início" />
      </div>

      {/* Feed */}
      <div className="bg-gray-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-300">Últimos pedidos</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-xl py-6">
            Nenhum pedido ainda — assim que entrar o primeiro, ele aparece aqui. 🚀
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((o, i) => (
              <div
                key={o.id ?? i}
                className="flex items-center justify-between border-b border-gray-700 pb-3 last:border-0"
              >
                <span className="text-xl font-semibold truncate max-w-[45%]">
                  {o.restaurant_name || o.restaurante || 'Restaurante'}
                </span>
                <span className="text-lg text-gray-400">
                  {STATUS_LABELS[o.status] || o.status || '—'}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {brl(o.total_amount ?? o.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
