import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Store, Bike, Users, Receipt } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

/**
 * Prontidão da praça.
 *
 * Responde UMA pergunta: "se um cliente abrir o app agora, ele consegue pedir?"
 * — e, quando não consegue, quem está faltando.
 *
 * Existe porque os números que importam estavam espalhados e nenhum aparecia
 * em lugar nenhum. Dava pra ter 12 lojas "aprovadas e ativas" no painel e o
 * cliente ver três, sendo uma vazia: o painel contava CADASTRO, esta tela
 * conta VITRINE. As regras aqui são as mesmas da listagem pública — aprovada,
 * ativa, dono ativo e COM COORDENADA (loja sem lat/lng é escondida do cliente
 * de propósito) — mais a única que decide se ele tem o que pedir: cardápio.
 */
/** "hoje 11:32" / "ontem" / "há 3 dias" — o que decide se cobra de novo.
 *
 *  Uma data seca ("08/09/2026 11:32") obriga a fazer a conta de cabeça toda
 *  vez. O que importa aqui é uma pergunta só: já dei tempo pra pessoa? */
function quando(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // Diferença em DIAS DE CALENDÁRIO, não em 24h: às 8h da manhã, algo enviado
  // às 22h de ontem é "ontem", e não "há 10 horas".
  const meiaNoite = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dias = Math.round((meiaNoite(new Date()) - meiaNoite(d)) / 86400000);
  if (dias <= 0) return `hoje ${hora}`;
  if (dias === 1) return `ontem ${hora}`;
  if (dias < 30) return `há ${dias} dias`;
  return `em ${d.toLocaleDateString('pt-BR')}`;
}

export default function ProntidaoPage() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setCarregando(true);
    setErro('');
    try {
      const token = authService.getToken();
      const r = await fetch(`${API_BASE_URL}/api/admin/prontidao`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'Falha ao carregar');
      setDados(j.data);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Falha ao carregar'));
    } finally {
      setCarregando(false);
    }
  };

  // ── Cobrar cadastro por push ────────────────────────────────────────────
  // O texto do push NÃO sai daqui: o backend recalcula o que falta e monta a
  // mensagem. A tela pode estar velha, e cobrar cardápio de quem já cadastrou
  // é o jeito mais rápido de ensinar a pessoa a ignorar nossas notificações.
  const [cobrando, setCobrando] = useState('');
  const [resultado, setResultado] = useState(null);

  const cobrar = async (tipo, id, nome) => {
    if (!id || cobrando) return;
    if (!window.confirm(
      `Enviar uma notificação para ${nome} pedindo que termine o cadastro?`
    )) return;
    setCobrando(id);
    setResultado(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/prontidao/cobrar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authService.getToken()}`,
                   'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, id }),
      });
      const j = await r.json();
      setResultado({ ok: r.ok, msg: j?.message || (r.ok ? 'Enviado.' : 'Não deu.') });
      // Marca a linha SEM recarregar a tela: carregar() acende o "Conferindo a
      // praça…" e apagaria o aviso do envio que a pessoa acabou de ler.
      // A data vem do servidor, não do relógio deste computador.
      if (r.ok && j?.cobrado_em) marcarCobrado(tipo, id, j.cobrado_em);
    } catch {
      setResultado({ ok: false, msg: 'Falha de rede ao enviar.' });
    } finally {
      setCobrando('');
    }
  };

  const marcarCobrado = (tipo, id, quando) => {
    const chave = tipo === 'loja' ? 'lojas' : 'entregadores';
    setDados((d) => d && ({
      ...d,
      [chave]: d[chave].map((x) => (x.id === id ? { ...x, cobrado_em: quando } : x)),
    }));
  };

  // Coluna de ação: o verde só aparece quando o servidor CONFIRMOU o envio —
  // ele vem do banco, então sobrevive ao F5 e ao dia seguinte. Sem isso o
  // sinal viveria no estado do React e a mesma pessoa levaria a mesma
  // cobrança a cada recarga da tela.
  const BotaoCobrar = ({ tipo, id, nome, cobradoEm }) => (
    <div className="flex items-center justify-end gap-3">
      {cobradoEm && (
        <span
          title={new Date(cobradoEm).toLocaleString('pt-BR')}
          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 whitespace-nowrap"
        >
          <CheckCircle2 size={15} className="shrink-0" />
          Cobrado {quando(cobradoEm)}
        </span>
      )}
      <button
        onClick={() => cobrar(tipo, id, nome)}
        disabled={cobrando === id}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-50
                    whitespace-nowrap ${cobradoEm
            ? 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
            : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
      >
        {cobrando === id ? 'Enviando…' : cobradoEm ? 'Cobrar de novo' : '🔔 Cobrar cadastro'}
      </button>
    </div>
  );

  useEffect(() => { carregar(); }, []);

  if (carregando) {
    return <div className="p-8 text-gray-500">Conferindo a praça…</div>;
  }
  if (erro) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-3">{erro}</p>
        <button onClick={carregar} className="px-4 py-2 rounded border border-gray-300">
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!dados) return null;

  const { resumo, lojas, entregadores, clientes, pedidos, pracas } = dados;
  const itensSemPeso = dados.itens_sem_peso || [];

  const lojasComProblema = lojas.filter((l) => l.faltas.length > 0);
  const entregadoresComProblema = entregadores.filter((e) => e.faltas.length > 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prontidão da praça</h1>
          <p className="text-sm text-gray-500 mt-1">
            O cliente só consegue pedir de uma loja que ele <strong>vê</strong> e
            que tem <strong>cardápio</strong>. É isso que esta tela conta — não
            quantos cadastros existem.
          </p>
        </div>
        <button
          onClick={carregar}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {/* Números que decidem */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Cartao
          icone={Store}
          rotulo="Lojas vendáveis"
          valor={resumo.lojas_vendaveis}
          de={resumo.lojas_cadastradas}
          ajuda="aparecem no app E têm cardápio"
          alerta={resumo.lojas_vendaveis === 0}
        />
        <Cartao
          icone={Bike}
          rotulo="Entregadores prontos"
          valor={resumo.entregadores_prontos}
          de={resumo.entregadores_cadastrados}
          ajuda="podem receber pedido agora"
          alerta={resumo.entregadores_prontos === 0}
        />
        <Cartao
          icone={Users}
          rotulo="Clientes com endereço"
          valor={clientes.com_endereco}
          de={clientes.total}
          ajuda={`${clientes.com_push} com avisos ligados`}
        />
        <Cartao
          icone={Receipt}
          rotulo="Pedidos (7 dias)"
          valor={pedidos.ultimos_7_dias}
          de={pedidos.total}
          ajuda={pedidos.total === 0 ? 'nenhum pedido, nunca' : `${pedidos.entregues} entregues no total`}
          alerta={pedidos.total === 0}
        />
      </div>

      {/* Praças */}
      <Secao titulo="Onde dá pra pedir hoje">
        {pracas.length === 0 ? (
          <p className="text-sm text-red-600">
            Nenhuma praça com loja vendável. Um cliente que abrir o app não
            encontra nada pra pedir.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pracas.map((p) => (
              <span key={p.praca} className="px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-sm border border-green-200">
                {p.praca} — {p.lojas_vendaveis} {p.lojas_vendaveis === 1 ? 'loja' : 'lojas'}
              </span>
            ))}
          </div>
        )}
      </Secao>

      {resultado && (
        <div className={`mb-4 rounded-xl border p-3 text-sm ${
          resultado.ok ? 'bg-green-50 border-green-200 text-green-800'
                       : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {resultado.msg}
        </div>
      )}

      <Secao
        titulo={`Lojas que não estão vendendo (${lojasComProblema.length})`}
        vazio="Todas as lojas cadastradas estão vendáveis."
        temItens={lojasComProblema.length > 0}
      >
        <Tabela
          colunas={['Loja', 'Praça', 'O que falta', '']}
          linhas={lojasComProblema.map((l) => [
            l.nome,
            [l.cidade, l.uf].filter(Boolean).join(' - ') || '—',
            <Faltas key="f" itens={l.faltas} />,
            <BotaoCobrar key="b" tipo="loja" id={l.id} nome={l.nome} cobradoEm={l.cobrado_em} />,
          ])}
        />
      </Secao>

      <Secao
        titulo={`Itens sem peso cadastrado (${itensSemPeso.length} ${itensSemPeso.length === 1 ? 'loja' : 'lojas'})`}
        vazio="Todos os itens dos segmentos pesados têm peso."
        temItens={itensSemPeso.length > 0}
      >
        <p className="text-xs text-gray-500 mb-3">
          Só conta lojas de pet, mercado, agropecuária e bebidas — comida não precisa.
          Item sem peso faz o pedido calcular <strong>0&nbsp;kg</strong>: sai com frete de
          moto mesmo pesando 60&nbsp;kg, e a trava de veículo deixa passar.
        </p>
        <Tabela
          colunas={['Loja', 'Segmento', 'Itens sem peso']}
          linhas={itensSemPeso.map((i) => [i.loja, i.segmento, i.itens])}
        />
      </Secao>

      <Secao
        titulo={`Entregadores que não recebem pedido (${entregadoresComProblema.length})`}
        vazio="Todos os entregadores cadastrados podem receber pedido."
        temItens={entregadoresComProblema.length > 0}
      >
        <p className="text-xs text-gray-500 mb-3">
          Estes ficam online e não chega nada — e o app não diz o motivo. Sem
          endereço no mapa o filtro de raio não sabe onde ele está; sem tipo de
          veículo o filtro de carga bloqueia por precaução.
        </p>
        <Tabela
          colunas={['Entregador', 'Cidade', 'O que falta', '']}
          linhas={entregadoresComProblema.map((e) => [
            e.nome,
            e.cidade || '—',
            <Faltas key="f" itens={e.faltas} />,
            <BotaoCobrar key="b" tipo="entregador" id={e.id} nome={e.nome} cobradoEm={e.cobrado_em} />,
          ])}
        />
      </Secao>
    </div>
  );
}

function Cartao({ icone: Icone, rotulo, valor, de, ajuda, alerta }) {
  return (
    <div className={`rounded-xl border p-4 ${alerta ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
        <Icone size={14} /> {rotulo}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">
        {valor}
        <span className="text-base font-normal text-gray-400"> de {de}</span>
      </p>
      <p className={`mt-0.5 text-xs ${alerta ? 'text-red-700' : 'text-gray-500'}`}>{ajuda}</p>
    </div>
  );
}

function Secao({ titulo, children, vazio, temItens = true }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{titulo}</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {temItens ? children : (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 size={16} /> {vazio}
          </p>
        )}
      </div>
    </section>
  );
}

function Faltas({ itens }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {itens.map((f) => (
        <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200">
          <AlertTriangle size={11} /> {f}
        </span>
      ))}
    </span>
  );
}

function Tabela({ colunas, linhas }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
            {colunas.map((c) => <th key={c} className="pb-2 pr-4 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((linha, i) => (
            <tr key={i}>
              {linha.map((celula, j) => (
                <td key={j} className="py-2.5 pr-4 align-top text-gray-700">{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
