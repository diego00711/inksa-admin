// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, DollarSign, BarChart3, Users, Clock, XOctagon, Store, Truck,
  AlertTriangle, CheckCircle2, Wallet, HandCoins, LifeBuoy, PackageX,
  MapPinOff, DoorOpen, TrendingUp, ArrowRight, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { getOverview } from '../services/analytics';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  blue: '#2563eb', green: '#22C55E', orange: '#F59E0B', red: '#EF4444',
  sky: '#0ea5e9', gray: '#64748b', purple: '#8b5cf6',
};

const brl = (v) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(Number(v) || 0);

/* ------------------------------------------------------------------ *
 * Painel de pendências — a parte que o dashboard não tinha.
 * KPI é retrovisor: conta o que já aconteceu. Isto aqui é a fila de
 * trabalho, e cada item leva direto pra tela onde se resolve.
 * ------------------------------------------------------------------ */
const TONS = {
  red:   { caixa: 'bg-red-50 border-red-200 hover:bg-red-100',       icone: 'text-red-600',    valor: 'text-red-700' },
  amber: { caixa: 'bg-amber-50 border-amber-200 hover:bg-amber-100', icone: 'text-amber-600',  valor: 'text-amber-700' },
  blue:  { caixa: 'bg-blue-50 border-blue-200 hover:bg-blue-100',    icone: 'text-blue-600',   valor: 'text-blue-700' },
};

const PainelPendencias = ({ op }) => {
  const itens = [
    {
      chave: 'semCoord', tom: 'red', icone: MapPinOff, para: '/usuarios',
      qtd: op.entregadoresSemCoordenada,
      titulo: 'Entregador online sem localização',
      detalhe: 'Está online mas o motor não enxerga — não recebe pedido nenhum.',
    },
    {
      chave: 'incompletos', tom: 'red', icone: Truck, para: '/usuarios',
      qtd: op.entregadoresIncompletos,
      titulo: 'Entregador online com cadastro incompleto',
      detalhe: 'Falta CPF, veículo, placa ou CNH — o despacho pula ele.',
    },
    {
      chave: 'ocorrencias', tom: 'red', icone: PackageX, para: '/ocorrencias',
      qtd: op.ocorrenciasAbertas,
      titulo: 'Ocorrência aberta',
      detalhe: 'Tem cliente esperando uma decisão sua.',
    },
    {
      chave: 'parceiros', tom: 'amber', icone: Store, para: '/restaurantes',
      qtd: op.parceirosPendentes,
      titulo: 'Parceiro aguardando aprovação',
      detalhe: 'Cadastrou e está parado até você liberar.',
    },
    {
      chave: 'repasses', tom: 'amber', icone: Wallet, para: '/financeiro/payouts',
      qtd: op.repassesPendentes, valor: op.repassesValor,
      titulo: 'Repasse pendente',
      detalhe: 'Dinheiro de parceiro esperando pagamento.',
    },
    {
      chave: 'tickets', tom: 'blue', icone: LifeBuoy, para: '/suporte',
      qtd: op.ticketsAbertos,
      titulo: 'Ticket de suporte aberto',
      detalhe: 'Alguém pediu ajuda e ainda não foi respondido.',
    },
    {
      chave: 'dividas', tom: 'blue', icone: HandCoins, para: '/financeiro/dividas',
      qtd: (op.dividaParceiros || 0) + (op.dividaEntregadores || 0) > 0 ? 1 : 0,
      valor: (op.dividaParceiros || 0) + (op.dividaEntregadores || 0),
      titulo: 'Comissão a receber',
      detalhe: 'De pedidos em dinheiro, ainda não acertados.',
    },
  ].filter((i) => Number(i.qtd) > 0);

  if (!itens.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Nada pendente</p>
          <p className="text-sm text-green-700">
            Sem ocorrência aberta, repasse a pagar ou parceiro esperando aprovação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-800">Precisa de você</h2>
        <span className="text-sm text-gray-500">({itens.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {itens.map((i) => {
          const t = TONS[i.tom];
          const Icone = i.icone;
          return (
            <Link
              key={i.chave}
              to={i.para}
              className={`group flex items-start gap-3 rounded-xl border p-4 transition-colors ${t.caixa}`}
            >
              <Icone className={`h-5 w-5 mt-0.5 shrink-0 ${t.icone}`} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">
                  <span className={t.valor}>
                    {i.valor != null ? brl(i.valor) : i.qtd}
                  </span>
                  {' · '}{i.titulo}{i.valor == null && i.qtd > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-600">{i.detalhe}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const CardHero = ({ receita, comissao, margem }) => (
  <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-blue-100 text-sm font-medium">Receita da Inksa</p>
        <p className="text-4xl font-bold mt-1 break-words">{brl(receita)}</p>
        <p className="text-blue-100 text-xs mt-2">
          O que fica com a plataforma — comissão + margem de frete
        </p>
      </div>
      <TrendingUp className="h-9 w-9 opacity-70 shrink-0" />
    </div>
    <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-blue-100">Comissão</p>
        <p className="font-semibold text-base">{brl(comissao)}</p>
      </div>
      <div>
        <p className="text-blue-100">Margem de frete</p>
        <p className="font-semibold text-base">{brl(margem)}</p>
      </div>
    </div>
  </div>
);

const Kpi = ({ titulo, valor, icone: Icone, cor, dica }) => (
  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      <span className={`rounded-lg p-2 ${cor}`}><Icone className="h-4 w-4" /></span>
    </div>
    <p className="text-2xl font-bold text-gray-800 mt-2 break-words">{valor}</p>
    {dica && <p className="text-xs text-gray-400 mt-1">{dica}</p>}
  </div>
);

const RevenueChart = ({ data }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-lg font-bold text-gray-800 mb-4">Volume vendido por dia</h3>
    {data?.length ? (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="formatted_date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [brl(v), 'Vendido']} />
          <Bar dataKey="daily_revenue" name="Vendido no dia" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <p className="text-gray-400 text-sm py-16 text-center">Sem vendas no período.</p>
    )}
  </div>
);

const OrdersStatusPie = ({ data }) => {
  const cores = {
    pendente: COLORS.orange, pending: COLORS.orange,
    concluido: COLORS.green, delivered: COLORS.green, completed: COLORS.green,
    cancelado: COLORS.red, cancelled: COLORS.red, canceled: COLORS.red,
    em_andamento: COLORS.blue, preparing: COLORS.blue, on_the_way: COLORS.sky,
    accepted_by_delivery: COLORS.sky, awaiting_payment: COLORS.purple,
  };
  const rotulos = {
    pending: 'Pendente', delivered: 'Entregue', completed: 'Concluído',
    cancelled: 'Cancelado', canceled: 'Cancelado', preparing: 'Preparando',
    on_the_way: 'Em rota', accepted_by_delivery: 'Aceito', awaiting_payment: 'Aguardando pgto',
    ready_for_pickup: 'Pronto', delivery_failed: 'Falhou',
  };
  const entries = Object.entries(data || {}).filter(([, c]) => Number(c) > 0);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Pedidos por status</h3>
      {entries.length ? (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={entries.map(([s, c]) => ({
                name: rotulos[s] || s.replace(/_/g, ' '),
                value: Number(c || 0),
                color: cores[s] || COLORS.gray,
              }))}
              innerRadius={50} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={2}
            >
              {entries.map(([s]) => <Cell key={s} fill={cores[s] || COLORS.gray} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v} pedidos`, 'Total']} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-sm py-16 text-center">Nenhum pedido ainda.</p>
      )}
    </div>
  );
};

const ClientsLineChart = ({ data }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-lg font-bold text-gray-800 mb-4">Clientes cadastrados</h3>
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="formatted_date" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${v} clientes`, 'Total']} />
        <Line type="monotone" dataKey="total_clients" name="Clientes" stroke={COLORS.green} strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const RecentOrdersList = ({ orders }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-lg font-bold text-gray-800 mb-4">Pedidos recentes</h3>
    {orders?.length ? (
      <div className="divide-y divide-gray-100">
        {orders.slice(0, 8).map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-700 truncate">{o.client_name || '-'}</p>
              <p className="text-sm text-gray-500 truncate">{o.restaurant_name || '-'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-gray-800">{brl(o.total_amount)}</p>
              <p className="text-xs text-gray-500">
                {/* Quanto ESTE pedido deixou pra Inksa. O valor total é quase
                    todo do parceiro; sem isto o número engana. */}
                {o.platform_commission > 0 && (
                  <span className="text-green-600 font-medium">
                    +{brl(o.platform_commission)}{' · '}
                  </span>
                )}
                <span className="capitalize">{(o.status || '-').replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-400 text-sm py-8 text-center">Nenhum pedido recente.</p>
    )}
  </div>
);

/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const { user } = useAuth();
  const [dados, setDados] = useState(null);
  const [period, setPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const makeRange = (p) => {
    const end = new Date();
    const start = new Date();
    if (p === 'month') start.setMonth(end.getMonth() - 1);
    else start.setDate(end.getDate() - 7);
    // Data LOCAL (Brasil), não toISOString (UTC): às 22h de SP o UTC já é o dia
    // seguinte, e o período saía deslocado 1 dia (zerava/torcia o gráfico).
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: fmt(start), to: fmt(end) };
  };

  const carregar = React.useCallback(async () => {
    setError(null);
    const { from, to } = makeRange(period);
    try {
      const d = await getOverview({ from, to, limit: 20 });
      const k = d?.kpis || {};
      setDados({
        kpis: k,
        chartData: d?.chartData || [],
        clientsGrowth: d?.clientsGrowth || d?.chartData || [],
        ordersStatus: d?.ordersStatus || {},
        recentOrders: d?.recentOrders || [],
        operacao: d?.operacao || {},
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Erro ao buscar os dados do dashboard.');
      // Zeros, nunca número inventado: dashboard que mente é pior que vazio.
      setDados({ kpis: {}, chartData: [], clientsGrowth: [], ordersStatus: {}, recentOrders: [], operacao: {} });
    }
  }, [period]);

  useEffect(() => {
    let vivo = true;
    (async () => { setIsLoading(true); await carregar(); if (vivo) setIsLoading(false); })();
    return () => { vivo = false; };
  }, [carregar]);

  const atualizar = async () => {
    setIsRefreshing(true);
    await carregar();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full py-24"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  const k = dados.kpis;
  const op = dados.operacao;

  const adminName =
    user?.name || user?.full_name ||
    (user?.email ? user.email.split('@')[0] : null) || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">{greeting}, {adminName}!</h1>
          <p className="text-gray-600 text-sm sm:text-base">Como está a plataforma agora.</p>
        </div>
        <div className="flex items-center gap-2">
          {[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border ${
                period === opt.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={atualizar}
            disabled={isRefreshing}
            className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠️ Não foi possível conectar à API: {error}. Os números abaixo estão zerados até a conexão voltar.
        </div>
      )}

      <PainelPendencias op={op} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardHero
          receita={k.platformRevenue}
          comissao={k.platformCommission}
          margem={k.deliveryMargin}
        />
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
          <Kpi titulo="Volume vendido" valor={brl(k.totalRevenue)} icone={DollarSign}
               cor="bg-sky-100 text-sky-600" dica="Total pago pelos clientes (quase tudo é do parceiro)" />
          <Kpi titulo="Ticket médio" valor={brl(k.averageTicket)} icone={BarChart3}
               cor="bg-purple-100 text-purple-600" />
          <Kpi titulo="Pedidos hoje" valor={k.ordersToday ?? 0} icone={BarChart3}
               cor="bg-green-100 text-green-600" />
          <Kpi titulo="Novos clientes hoje" valor={k.newClientsToday ?? 0} icone={Users}
               cor="bg-orange-100 text-orange-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* "Online" engana: o que importa é quantos o motor de despacho
            realmente alcança. Mostrar os dois lado a lado expõe o buraco. */}
        <Kpi titulo="Entregadores aptos"
             valor={`${op.entregadoresAptos ?? 0} de ${op.entregadoresOnline ?? 0}`}
             icone={Truck} cor="bg-green-100 text-green-600"
             dica={(op.entregadoresOnline ?? 0) > (op.entregadoresAptos ?? 0)
               ? 'Os demais estão online mas não recebem pedido'
               : 'Todos os online recebem pedido'} />
        <Kpi titulo="Lojas abertas agora" valor={`${op.lojasAbertas ?? 0} de ${op.lojasAprovadas ?? 0}`}
             icone={DoorOpen} cor="bg-blue-100 text-blue-600" />
        <Kpi titulo="Pedidos em andamento" valor={k.ordersInProgress ?? 0} icone={Clock}
             cor="bg-purple-100 text-purple-600" />
        <Kpi titulo="Pedidos cancelados" valor={k.ordersCanceled ?? 0} icone={XOctagon}
             cor="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RevenueChart data={dados.chartData} />
          <ClientsLineChart data={dados.clientsGrowth} />
        </div>
        <div className="space-y-6">
          <OrdersStatusPie data={dados.ordersStatus} />
          <RecentOrdersList orders={dados.recentOrders} />
        </div>
      </div>
    </div>
  );
}
