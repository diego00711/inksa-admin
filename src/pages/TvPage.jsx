// src/pages/TvPage.jsx
// Painel de parede do escritorio (rota /tv). Fica aberto 24/7 numa TV.
//
// Premissas de projeto (mantidas do original):
//  - NUNCA deslogar por falha temporaria: erro de rede/backend hibernando so
//    mostra "reconectando" e tenta de novo (o apiClient renova a sessao).
//  - Legivel de longe: fundo escuro, numeros gigantes, zero menu.
//  - Mantem os ultimos dados na tela enquanto reconecta (nao pisca zerado).
//  - h-screen + overflow-hidden: um painel de parede NUNCA rola.
//
// Camada visual (2026-07-18): tema "mission control" — fundo com aurora que
// respira, cards em vidro com icone, numeros que sobem contando a cada
// atualizacao, card-heroi com brilho e grafico de 7 dias com barras em
// gradiente + linha de media + destaque no dia de hoje. Tudo em CSS/rAF, sem
// libs, pra rodar leve o dia inteiro.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ShoppingBag, Timer, Loader2, Receipt, TrendingUp,
  Bike, Store, Wallet, PiggyBank, Users, AlertTriangle,
} from 'lucide-react';
import authService from '../services/authService';

const POLL_MS = 30000;

const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const int = (v) => Math.round(Number(v) || 0).toLocaleString('pt-BR');

const STATUS_META = {
  pending:     { label: 'Aguardando',   cls: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' },
  accepted:    { label: 'Aceito',       cls: 'bg-sky-400/15 text-sky-300 ring-sky-400/30' },
  preparing:   { label: 'Em preparo',   cls: 'bg-blue-400/15 text-blue-300 ring-blue-400/30' },
  ready:       { label: 'Pronto',       cls: 'bg-indigo-400/15 text-indigo-300 ring-indigo-400/30' },
  on_the_way:  { label: 'A caminho',    cls: 'bg-cyan-400/15 text-cyan-300 ring-cyan-400/30' },
  in_progress: { label: 'Em andamento', cls: 'bg-cyan-400/15 text-cyan-300 ring-cyan-400/30' },
  delivered:   { label: 'Entregue',     cls: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' },
  completed:   { label: 'Concluído',    cls: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' },
  cancelled:   { label: 'Cancelado',    cls: 'bg-rose-400/15 text-rose-300 ring-rose-400/30' },
  canceled:    { label: 'Cancelado',    cls: 'bg-rose-400/15 text-rose-300 ring-rose-400/30' },
};

const AVATAR_TONES = [
  'from-orange-500 to-amber-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-fuchsia-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-teal-600',
];
const toneFor = (s = '') =>
  AVATAR_TONES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

// Keyframes do painel — injetadas uma vez. Nomes com prefixo tv- pra nao
// colidir com nada global.
const KEYFRAMES = `
@keyframes tvAurora1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(6%,5%) scale(1.12)} }
@keyframes tvAurora2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-5%,-4%) scale(1.1)} }
@keyframes tvRise { from{transform:scaleY(0)} to{transform:scaleY(1)} }
@keyframes tvShimmer { 0%{transform:translateX(-140%)} 55%,100%{transform:translateX(240%)} }
@keyframes tvPulse { 0%,100%{opacity:.9;transform:scale(1)} 50%{opacity:.25;transform:scale(2.2)} }
@keyframes tvFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.tv-aurora-1{animation:tvAurora1 20s ease-in-out infinite}
.tv-aurora-2{animation:tvAurora2 26s ease-in-out infinite}
.tv-rise{transform-origin:bottom;animation:tvRise .9s cubic-bezier(.16,1,.3,1) both}
.tv-shimmer{background:linear-gradient(105deg,transparent 32%,rgba(255,255,255,.22) 50%,transparent 68%);animation:tvShimmer 6s ease-in-out infinite}
.tv-ping{animation:tvPulse 1.8s cubic-bezier(0,0,.2,1) infinite}
.tv-fadeup{animation:tvFadeUp .5s ease-out both}
`;

// Numero que sobe contando quando o valor muda (rAF, easeOutCubic). Como os
// dados so mudam a cada 30s e a animacao dura <1s, ela sempre termina antes da
// proxima — o "from" nunca fica no meio do caminho.
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(Number(target) || 0);
  const fromRef = useRef(Number(target) || 0);
  const rafRef = useRef();
  useEffect(() => {
    const to = Number(target) || 0;
    const from = Number(fromRef.current) || 0;
    if (from === to) { setVal(to); return; }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(from + (to - from) * ease(p));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

function StatCard({ icon: Icon, label, value, format = 'int', sub, tone = 'default', loading, iconSpin }) {
  const n = useCountUp(loading ? 0 : value);
  const display = format === 'brl' ? brl(n) : int(n);
  const hero = tone === 'hero';
  const soft = tone === 'soft';

  const shell = hero
    ? 'border-orange-400/40 bg-gradient-to-br from-orange-500 to-orange-700 shadow-[0_18px_50px_-12px_rgba(249,115,22,0.65)]'
    : soft
    ? 'border-orange-400/20 bg-orange-500/[0.08] backdrop-blur-sm'
    : 'border-white/[0.06] bg-slate-800/50 backdrop-blur-sm';
  const labelCls = hero ? 'text-orange-50/90' : soft ? 'text-orange-200/80' : 'text-slate-400';
  const chipCls = hero ? 'bg-white/20 text-white' : soft ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700/60 text-slate-300';
  const subCls = hero ? 'text-orange-50/80' : soft ? 'text-orange-200/70' : 'text-slate-500';
  const sizeCls = hero ? 'text-6xl' : format === 'brl' ? 'text-[2.6rem] leading-none' : 'text-6xl';

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between ${shell}`}>
      {hero && <div className="tv-shimmer pointer-events-none absolute inset-0" />}
      <div className="relative flex items-center justify-between">
        <span className={`text-[0.8rem] font-semibold uppercase tracking-wider ${labelCls}`}>{label}</span>
        <span className={`grid place-items-center h-9 w-9 rounded-xl ${chipCls}`}>
          <Icon className={`h-5 w-5 ${iconSpin ? 'animate-spin' : ''}`} />
        </span>
      </div>
      <span className={`relative mt-3 font-black tracking-tight tabular-nums text-white ${sizeCls}`}>
        {loading
          ? <span className="inline-block h-9 w-24 rounded-lg bg-white/10 animate-pulse align-middle" />
          : display}
      </span>
      {sub && <span className={`relative text-xs mt-1.5 ${subCls}`}>{sub}</span>}
    </div>
  );
}

function BaseRow({ icon: Icon, label, total, today }) {
  const n = useCountUp(total == null ? 0 : total);
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <span className="flex items-center gap-3 text-lg text-slate-300">
        <span className="grid place-items-center h-9 w-9 rounded-lg bg-slate-700/50 text-slate-300">
          <Icon className="h-5 w-5" />
        </span>
        {label}
      </span>
      <div className="flex items-baseline gap-3">
        {today > 0 && (
          <span className="text-xs font-bold text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-400/20 rounded-full px-2 py-0.5">
            +{today} hoje
          </span>
        )}
        <span className="text-3xl font-black tabular-nums text-white">{total == null ? '—' : int(n)}</span>
      </div>
    </div>
  );
}

// Barras em CSS puro (leve numa TV) + gradiente, linha de media e destaque no
// dia de hoje. Com receita zerada mostra a linha base e as datas, pra deixar
// claro que esta vazio de proposito e nao quebrado.
function Chart({ data }) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;
  const vals = rows.map((r) => Number(r.daily_revenue) || 0);
  const max = Math.max(...vals, 0);
  const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-800/50 backdrop-blur-sm p-5 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[0.8rem] font-semibold uppercase tracking-wider text-slate-400">
          Receita dos últimos 7 dias
        </h2>
        {max > 0 && (
          <span className="text-xs text-slate-500">
            média <span className="text-slate-200 font-semibold tabular-nums">{brl(avg)}</span>
          </span>
        )}
      </div>
      <div className="relative flex items-end justify-between gap-3 h-28">
        {max > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/15 transition-all duration-700"
            style={{ bottom: `${(avg / max) * 100}%` }}
          />
        )}
        {rows.map((r, i) => {
          const v = Number(r.daily_revenue) || 0;
          const pct = max > 0 ? Math.max((v / max) * 100, 2) : 2;
          const isToday = r.formatted_date === todayStr;
          return (
            <div key={r.formatted_date ?? i} className="relative flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
              {v > 0 && (
                <span className={`text-xs font-bold tabular-nums ${isToday ? 'text-orange-300' : 'text-slate-300'}`}>
                  {brl(v).replace('R$', '').trim()}
                </span>
              )}
              <div
                className={`tv-rise w-full rounded-t-lg transition-all duration-700 ${
                  v > 0
                    ? isToday
                      ? 'bg-gradient-to-t from-orange-600 to-orange-400 shadow-[0_0_22px_-2px_rgba(249,115,22,0.75)]'
                      : 'bg-gradient-to-t from-orange-700/70 to-orange-500/70'
                    : 'bg-slate-700/40'
                }`}
                style={{ height: `${pct}%` }}
              />
              <span className={`text-xs tabular-nums ${isToday ? 'text-orange-300 font-bold' : 'text-slate-500'}`}>
                {r.formatted_date}
              </span>
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
  const loading = data === null;
  const orders = (d.recentOrders || []).slice(0, 8);
  const pending = d.restaurantsPending || 0;
  const dateStr = clock.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 text-white">
      <style>{KEYFRAMES}</style>

      {/* Aurora de fundo — respira devagar; nunca gera scroll (inset-0 + overflow) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tv-aurora-1 absolute -top-1/3 -left-1/4 h-[70vh] w-[70vh] rounded-full bg-orange-600/20 blur-[130px]" />
        <div className="tv-aurora-2 absolute -bottom-1/3 -right-1/4 h-[70vh] w-[70vh] rounded-full bg-sky-600/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_55%,rgba(2,6,23,0.6))]" />
      </div>

      <div className="relative h-full flex flex-col p-6">
        {/* Cabecalho */}
        <div className="flex items-end justify-between mb-4 shrink-0">
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-black text-orange-500" style={{ textShadow: '0 0 28px rgba(249,115,22,0.5)' }}>
              inksa
            </span>
            <span className="hidden sm:inline text-lg text-slate-500">Painel do escritório</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 capitalize">{dateStr}</div>
            <div className="text-5xl font-black tabular-nums leading-none mt-0.5">
              {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`tv-ping absolute inline-flex h-full w-full rounded-full ${offline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${offline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </span>
              {offline ? (
                <span className="text-amber-400">Reconectando…</span>
              ) : (
                <span className="text-emerald-400">
                  Ao vivo
                  {updatedAt && ` · ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alerta acionavel: some sozinho quando nao ha nada a fazer */}
        {pending > 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 px-5 py-3 mb-4 shrink-0 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.6)]">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <span className="text-xl font-bold">
              {pending === 1
                ? '1 restaurante aguardando sua aprovação'
                : `${pending} restaurantes aguardando sua aprovação`}
            </span>
          </div>
        )}

        {/* Hoje */}
        <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
          <StatCard icon={ShoppingBag} label="Pedidos hoje" value={d.ordersToday} loading={loading} />
          <StatCard icon={Number(d.ordersInProgress) > 0 ? Loader2 : Timer} iconSpin={Number(d.ordersInProgress) > 0}
                    label="Em andamento" value={d.ordersInProgress} loading={loading} />
          <StatCard icon={Receipt} label="Faturamento hoje" value={d.revenueToday} format="brl" loading={loading} />
          <StatCard icon={TrendingUp} label="Sua receita hoje" value={d.platformRevenueToday} format="brl"
                    sub="comissão + margem do frete" tone="hero" loading={loading} />
        </div>

        {/* Agora + acumulado */}
        <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
          <StatCard icon={Bike} label="Entregadores online" value={d.deliverymenOnline} loading={loading} />
          <StatCard icon={Store} label="Restaurantes abertos" value={d.restaurantsOpen} loading={loading} />
          <StatCard icon={Wallet} label="Faturamento total" value={d.revenueTotal} format="brl" sub="desde o início" loading={loading} />
          <StatCard icon={PiggyBank} label="Sua receita total" value={d.platformRevenueTotal} format="brl"
                    sub="desde o início" tone="soft" loading={loading} />
        </div>

        {/* Feed + base: linha elastica (flex-1). min-h-0 e obrigatorio pro filho
            com overflow conseguir encolher dentro do flex. */}
        <div className="grid grid-cols-3 gap-4 mb-4 flex-1 min-h-0">
          <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-slate-800/50 backdrop-blur-sm p-5 flex flex-col min-h-0">
            <h2 className="text-[0.8rem] font-semibold uppercase tracking-wider text-slate-400 mb-3 shrink-0">
              Últimos pedidos
            </h2>
            {orders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                <div className="text-5xl">🚀</div>
                <p className="text-slate-400 text-lg">
                  Nenhum pedido ainda — assim que entrar o primeiro, ele aparece aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-hidden">
                {orders.map((o, i) => {
                  const name = o.restaurant_name || o.restaurante || 'Restaurante';
                  const st = STATUS_META[o.status] || { label: o.status || '—', cls: 'bg-slate-600/20 text-slate-300 ring-slate-500/30' };
                  return (
                    <div
                      key={o.id ?? i}
                      className="tv-fadeup flex items-center gap-4 rounded-xl bg-white/[0.03] px-3 py-2.5"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${toneFor(name)} text-white font-black text-lg`}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-lg font-semibold truncate flex-1">{name}</span>
                      <span className={`text-sm font-semibold rounded-full px-3 py-1 ring-1 ${st.cls}`}>{st.label}</span>
                      <span className="text-lg font-black tabular-nums w-28 text-right">
                        {brl(o.total_amount ?? o.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-slate-800/50 backdrop-blur-sm p-5 min-h-0">
            <h2 className="text-[0.8rem] font-semibold uppercase tracking-wider text-slate-400 mb-1">A base</h2>
            <BaseRow icon={Store} label="Restaurantes" total={d.restaurantsTotal} today={d.restaurantsToday} />
            <BaseRow icon={Bike} label="Entregadores" total={d.deliverymenTotal} today={d.deliverymenToday} />
            <BaseRow icon={Users} label="Clientes" total={d.clientsTotal} today={d.clientsToday} />
          </div>
        </div>

        <Chart data={d.chartData} />
      </div>
    </div>
  );
}
