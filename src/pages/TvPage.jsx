// src/pages/TvPage.jsx
// Painel de parede do escritorio (rota /tv). Fica aberto 24/7 numa TV.
//
// Premissas de projeto:
//  - NUNCA deslogar por falha temporaria: erro de rede/backend hibernando so
//    mostra "reconectando" e tenta de novo (o apiClient renova a sessao).
//  - Legivel de longe: fundo escuro, numeros gigantes, zero menu.
//  - Mantem os ultimos dados na tela enquanto reconecta (nao pisca zerado).
//  - Hierarquia: o dia de hoje domina; a base cadastrada e o historico ficam
//    embaixo, menores. Antes do lancamento a base e o unico numero que anda.
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
      className={`rounded-2xl p-5 flex flex-col justify-between ${
        accent ? 'bg-orange-600' : 'bg-gray-800'
      }`}
    >
      <span className={`text-base font-semibold ${accent ? 'text-orange-100' : 'text-gray-400'}`}>
        {label}
      </span>
      <span
        className={`font-black tracking-tight text-white ${big ? 'text-6xl' : 'text-4xl'} mt-1`}
      >
        {value}
      </span>
      {sub && (
        <span className={`text-sm mt-1 ${accent ? 'text-orange-100' : 'text-gray-500'}`}>
          {sub}
        </span>
      )}
    </div>
  );
}

// Linha do placar da base. O "+N hoje" so aparece quando entrou gente hoje —
// e o retorno das campanhas de pre-cadastro chegando.
function BaseRow({ label, total, today }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-lg text-gray-400">{label}</span>
      <div className="flex items-baseline gap-3">
        {today > 0 && (
          <span className="text-sm font-bold text-green-400 bg-green-400/10 rounded px-2 py-0.5">
            +{today} hoje
          </span>
        )}
        <span className="text-3xl font-black tabular-nums text-white">{total ?? '—'}</span>
      </div>
    </div>
  );
}

// Barras em CSS puro: numa TV isso e mais leve e mais legivel que um grafico de
// biblioteca. Com a receita zerada mostra a linha de base e os dias, pra deixar
// claro que esta vazio de proposito e nao quebrado.
function Chart({ data }) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => Number(r.daily_revenue) || 0), 0);

  return (
    <div className="bg-gray-800 rounded-2xl p-5 shrink-0">
      <h2 className="text-lg font-bold mb-3 text-gray-400">Receita dos últimos 7 dias</h2>
      <div className="flex items-end justify-between gap-2 h-24">
        {rows.map((r, i) => {
          const v = Number(r.daily_revenue) || 0;
          // max=0 (tudo zerado) cairia em divisao por zero; 2% vira a linha base
          const pct = max > 0 ? Math.max((v / max) * 100, 2) : 2;
          return (
            <div key={r.formatted_date ?? i} className="flex-1 flex flex-col items-center gap-1">
              {v > 0 && (
                <span className="text-xs font-bold text-gray-300 tabular-nums">
                  {brl(v).replace('R$', '').trim()}
                </span>
              )}
              <div
                className={`w-full rounded-t ${v > 0 ? 'bg-orange-500' : 'bg-gray-700'}`}
                style={{ height: `${pct}%` }}
              />
              <span className="text-xs text-gray-500 tabular-nums">{r.formatted_date}</span>
            </div>
          );
        })}
      </div>
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
  const pending = d.restaurantsPending || 0;

  return (
    // h-screen + overflow-hidden: um painel de parede NUNCA pode ganhar barra de
    // rolagem. A altura e fixa e o feed (flex-1) absorve a sobra — se faltar
    // espaco ele mostra menos pedidos em vez de empurrar o grafico pra fora.
    <div className="h-screen overflow-hidden flex flex-col bg-gray-900 text-white p-6">
      {/* Cabecalho */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-baseline gap-4">
          <span className="text-4xl font-black text-orange-500">inksa</span>
          <span className="text-lg text-gray-500">Painel do escritório</span>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black tabular-nums">
            {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm mt-0.5">
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

      {/* Alerta acionavel: some sozinho quando nao ha nada a fazer */}
      {pending > 0 && (
        <div className="bg-amber-500 text-gray-900 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 shrink-0">
          <span className="text-2xl">⚠️</span>
          <span className="text-xl font-bold">
            {pending === 1
              ? '1 restaurante aguardando sua aprovação'
              : `${pending} restaurantes aguardando sua aprovação`}
          </span>
        </div>
      )}

      {/* Hoje */}
      <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
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

      {/* Agora + acumulado */}
      <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
        <Card label="Entregadores online" value={d.deliverymenOnline ?? '—'} />
        <Card label="Restaurantes abertos" value={d.restaurantsOpen ?? '—'} />
        <Card label="Faturamento total" value={brl(d.revenueTotal)} sub="desde o início" />
        <Card label="Sua receita total" value={brl(d.platformRevenueTotal)} sub="desde o início" />
      </div>

      {/* Feed + base: esta linha e a elastica (flex-1). min-h-0 e obrigatorio,
          senao o filho com overflow nao consegue encolher dentro do flex. */}
      <div className="grid grid-cols-3 gap-4 mb-4 flex-1 min-h-0">
        <div className="col-span-2 bg-gray-800 rounded-2xl p-5 flex flex-col min-h-0">
          <h2 className="text-lg font-bold mb-2 text-gray-400 shrink-0">Últimos pedidos</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-lg py-4">
              Nenhum pedido ainda — assim que entrar o primeiro, ele aparece aqui. 🚀
            </p>
          ) : (
            <div className="space-y-2 overflow-hidden">
              {orders.map((o, i) => (
                <div
                  key={o.id ?? i}
                  className="flex items-center justify-between border-b border-gray-700 pb-2 last:border-0"
                >
                  <span className="text-lg font-semibold truncate max-w-[45%]">
                    {o.restaurant_name || o.restaurante || 'Restaurante'}
                  </span>
                  <span className="text-base text-gray-400">
                    {STATUS_LABELS[o.status] || o.status || '—'}
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {brl(o.total_amount ?? o.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-2xl p-5 min-h-0">
          <h2 className="text-lg font-bold mb-1 text-gray-400">A base</h2>
          <BaseRow label="Restaurantes" total={d.restaurantsTotal} today={d.restaurantsToday} />
          <BaseRow label="Entregadores" total={d.deliverymenTotal} today={d.deliverymenToday} />
          <BaseRow label="Clientes" total={d.clientsTotal} today={d.clientsToday} />
        </div>
      </div>

      <Chart data={d.chartData} />
    </div>
  );
}
