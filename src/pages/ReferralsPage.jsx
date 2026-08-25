// Indique e ganhe — painel de controle.
//
// Duas coisas numa tela: o que o programa está custando/trazendo, e os números
// da campanha editáveis sem deploy. A segunda existe porque estes valores
// mudaram três vezes numa tarde só.
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Gift, Loader2, Save, CheckCircle2, Users, Ticket, TrendingUp, AlertTriangle,
} from 'lucide-react';
import authService from '../services/authService';
import { NotificationContext } from '../context/NotificationContext';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (s) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');
const inputCls = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const CAMPOS = [
  { key: 'referral_reward_brl', label: 'Prêmio por indicação (R$)', step: '0.50',
    ajuda: 'Vai pra quem indicou, quando o pedido do indicado é entregue.' },
  { key: 'referral_min_order_brl', label: 'Mínimo de compra pro cupom (R$)', step: '1',
    ajuda: 'Sobre o subtotal, sem o frete. Abaixo disso a comissão não paga o cupom.' },
  { key: 'referral_welcome_min_brl', label: 'Mínimo do frete grátis do convidado (R$)', step: '1',
    ajuda: '0 = sem mínimo, converte mais. Mas frete grátis num pedido de R$15 dá prejuízo: a Inksa paga o entregador e fica com ~R$2 de comissão.' },
  { key: 'referral_validity_days', label: 'Validade do cupom (dias)', step: '1',
    ajuda: 'Cupom sem prazo vira dívida eterna e é resgatado na pior hora.' },
  { key: 'referral_monthly_cap', label: 'Teto de indicações premiadas por mês', step: '1',
    ajuda: 'Por pessoa. Limita a exposição se alguém achar um jeito não previsto.' },
];

function Cartao({ icone: Icone, titulo, valor, rodape, tom = 'indigo' }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <Icone className={`mb-2 h-5 w-5 text-${tom}-500`} />
      <p className="text-2xl font-bold text-gray-900">{valor}</p>
      <p className="text-xs font-medium text-gray-600">{titulo}</p>
      {rodape && <p className="mt-1 text-xs text-gray-400">{rodape}</p>}
    </div>
  );
}

export default function ReferralsPage() {
  const { notify } = useContext(NotificationContext);
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await authService.getReferralsPanel();
      const d = r?.data ?? r;
      setDados(d);
      setForm({ ...d.config });
    } catch (e) {
      setErro(e?.message || 'Erro ao carregar');
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    setSalvo(false);
    try {
      await authService.saveReferralsConfig(form);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
      carregar();
    } catch (e) {
      notify('Erro ao salvar: ' + (e?.message || e), 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (erro) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>;
  if (!dados || !form) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const { numeros, dinheiro, retencao, indicacoes, ranking } = dados;
  const ligado = Number(form.referral_enabled) > 0;
  const taxaVolta = retencao.indicados_com_pedido
    ? Math.round((retencao.voltaram / retencao.indicados_com_pedido) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
            <Gift className="h-6 w-6 text-orange-500" /> Indique e ganhe
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            O cliente ganha quando o amigo indicado recebe o primeiro pedido.
          </p>
        </div>
        {/* Desligar não apaga nada do que já foi dado: cupom emitido continua
            valendo. Só para de emitir novos. */}
        <div className="text-right">
          <button
            onClick={() => setForm({ ...form, referral_enabled: ligado ? 0 : 1 })}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              ligado ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}
          >
            {ligado ? 'Campanha ligada' : 'Campanha pausada'}
          </button>
          {/* Ligada MAS fora do prazo é o estado que confunde: o botão diz
              "ligada" e nada acontece. Aqui ele é dito em voz alta. */}
          {ligado && dados.config.no_prazo === false && (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              fora do período — não está premiando
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao icone={Users} titulo="indicações premiadas" valor={numeros.premiadas}
                rodape={`${numeros.pendentes} ainda sem o 1º pedido`} />
        <Cartao icone={Ticket} titulo="em cupons emitidos" valor={brl(dinheiro.emitido)}
                rodape="promessa, ainda não saiu do caixa" />
        {/* O número que importa pro caixa. Emitido é promessa; resgatado é
            dinheiro que saiu de verdade. */}
        <Cartao icone={TrendingUp} titulo="resgatado de fato" valor={brl(dinheiro.resgatado)}
                rodape={`${dinheiro.vencidos_sem_uso} venceram sem uso`} tom="green" />
        <Cartao icone={Users} titulo="dos indicados voltaram" valor={`${taxaVolta}%`}
                rodape={`${retencao.voltaram} de ${retencao.indicados_com_pedido} fizeram 2+ pedidos`} />
      </div>

      {/* A campanha só se paga do 2º pedido em diante. Sem esse aviso, é fácil
          olhar "premiadas" subindo e achar que está dando certo. */}
      {retencao.indicados_com_pedido >= 5 && taxaVolta < 40 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Só {taxaVolta}% dos indicados voltaram para um segundo pedido. A indicação
            custa perto de R$ 6 por cliente e só se paga do 2º pedido em diante —
            com essa taxa, o programa está trazendo primeiro pedido, não cliente.
          </span>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Números da campanha
        </p>
        {/* A data é uma trava À PARTE do interruptor: campanha com prazo
            termina sozinha, sem depender de alguém lembrar de desligar num
            domingo. Vazio = sem limite daquele lado. */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">Começa em (opcional)</label>
            <input type="date" value={form.referral_starts_at || ''}
                   onChange={(e) => setForm({ ...form, referral_starts_at: e.target.value })}
                   className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Termina em (opcional)</label>
            <input type="date" value={form.referral_ends_at || ''}
                   onChange={(e) => setForm({ ...form, referral_ends_at: e.target.value })}
                   className={inputCls} />
            <p className="mt-1 text-xs text-gray-400">
              Depois desta data o programa para sozinho. Cupom já emitido continua valendo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <div key={c.key}>
              <label className="block text-xs font-medium text-gray-600">{c.label}</label>
              <input
                type="number" min="0" step={c.step}
                value={form[c.key] ?? ''}
                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">{c.ajuda}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          O indicado sempre ganha frete grátis no primeiro pedido, sem mínimo — exigir
          valor logo na estreia derrubaria a conversão onde ela é mais frágil.
          E vale um cupom por pedido: dez indicações viram dez pedidos, não um desconto grande.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" />
              : salvo ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {ranking.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Quem mais traz gente
          </p>
          <div className="space-y-2">
            {ranking.map((p, i) => (
              <div key={p.codigo || i} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-2 text-sm last:border-0">
                <span className="truncate font-medium text-gray-800">
                  {i + 1}. {p.nome} <span className="text-xs text-gray-400">{p.codigo}</span>
                </span>
                <span className="shrink-0 text-gray-600">
                  <strong>{p.premiadas}</strong> premiadas · {p.total} no total
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Últimas indicações
        </p>
        {indicacoes.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            Nenhuma indicação ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="pb-2 pr-3">Quem indicou</th>
                  <th className="pb-2 pr-3">Indicado</th>
                  <th className="pb-2 pr-3">Entrou</th>
                  <th className="pb-2 pr-3">Premiada</th>
                  <th className="pb-2">Cupom</th>
                </tr>
              </thead>
              <tbody>
                {indicacoes.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 text-gray-800">{r.indicador}</td>
                    <td className="py-2 pr-3 text-gray-800">{r.indicado}</td>
                    <td className="py-2 pr-3 text-gray-500">{data(r.criada_em)}</td>
                    <td className="py-2 pr-3">
                      {r.premiada_em
                        ? <span className="text-green-700">{data(r.premiada_em)}</span>
                        : <span className="text-amber-600">aguardando 1º pedido</span>}
                    </td>
                    <td className="py-2 text-gray-600">
                      {r.cupom
                        ? <>{r.cupom} {r.cupom_usado
                            ? <span className="text-xs text-gray-400">(usado)</span>
                            : <span className="text-xs text-green-600">(disponível)</span>}</>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
