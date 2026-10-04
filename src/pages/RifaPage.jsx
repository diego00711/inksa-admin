import React, { useEffect, useState } from 'react';
import { Ticket, Search, AlertTriangle, RefreshCw, Power } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

/**
 * Campanha de números (sorteio da scooter).
 *
 * Duas funções, e a segunda é a que importa no dia:
 *   1. ACOMPANHAR — quantos números saíram, para quem, e de onde vieram.
 *   2. APURAR — sorteou-se um número, de quem é? Sem dúvida e na hora.
 *
 * ⚠️ A CHAVE "LIGADA" É O ATO QUE INICIA A CAMPANHA. Sorteio de prêmio exige
 * autorização prévia (Lei 5.768/1971). Enquanto está desligada, nenhum número
 * é gerado — é de propósito que o sistema fique pronto sem a campanha começar.
 */

const ROTULO_TIPO = { cliente: 'Clientes', parceiro: 'Parceiros', entregador: 'Entregadores' };
const ROTULO_ORIGEM = {
  cadastro: 'cadastro', pedido: 'pedidos', venda: 'vendas', entrega: 'entregas',
};

const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RifaPage() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const cabecalho = () => ({
    Authorization: `Bearer ${authService.getToken()}`,
    'Content-Type': 'application/json',
  });

  const carregar = async () => {
    setCarregando(true); setErro('');
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/rifa`, { headers: cabecalho() });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'Falha ao carregar');
      setDados(j.data);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Falha ao carregar'));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // ── Liga/desliga ────────────────────────────────────────────────────────
  // Confirmação com texto FORTE e específico: ligar não é "salvar uma
  // preferência", é dar partida numa campanha que distribui prêmio. Um
  // window.confirm genérico aqui seria subdimensionar o que o clique faz.
  const alternar = async (ligar) => {
    if (ligar && !window.confirm(
      'LIGAR A CAMPANHA?\n\n'
      + 'A partir deste clique o sistema começa a gerar números para clientes, '
      + 'parceiros e entregadores.\n\n'
      + 'Sorteio de prêmio exige AUTORIZAÇÃO PRÉVIA do Ministério da Fazenda. '
      + 'Só ligue se a autorização já estiver aprovada em mãos.\n\n'
      + 'Confirma?'
    )) return;
    if (!ligar && !window.confirm(
      'Desligar a campanha?\n\nNenhum número novo será gerado. '
      + 'Os já emitidos continuam valendo.'
    )) return;

    setSalvando(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/rifa/campanha`, {
        method: 'PUT', headers: cabecalho(),
        body: JSON.stringify({ campanha: dados?.campanha?.campanha, ligada: ligar }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'Não deu');
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Falha ao alterar a campanha'));
    } finally {
      setSalvando(false);
    }
  };

  // ── Busca da apuração ───────────────────────────────────────────────────
  const [termo, setTermo] = useState('');
  const [achados, setAchados] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const buscar = async (e) => {
    e?.preventDefault?.();
    const t = termo.trim();
    if (!t) return;
    setBuscando(true); setAchados(null);
    try {
      // Só dígitos = número sorteado. Qualquer outra coisa = nome.
      const q = /^\d+$/.test(t) ? `numero=${t}` : `nome=${encodeURIComponent(t)}`;
      const r = await fetch(`${API_BASE_URL}/api/admin/rifa/buscar?${q}`, { headers: cabecalho() });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'Falha na busca');
      setAchados(j.data || []);
    } catch (e2) {
      setErro(mensagemDeErro(e2, 'Falha na busca'));
    } finally {
      setBuscando(false);
    }
  };

  if (carregando) return <div className="p-8 text-gray-500">Carregando a campanha…</div>;

  if (erro && !dados) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-3">{erro}</p>
        <button onClick={carregar} className="px-4 py-2 rounded border border-gray-300">
          Tentar de novo
        </button>
      </div>
    );
  }

  const c = dados?.campanha;
  if (!c) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Nenhuma campanha cadastrada.</p>
      </div>
    );
  }

  const porTipo = dados.por_tipo || [];
  const ranking = dados.ranking || [];
  const totalValidos = porTipo.reduce((s, x) => s + Number(x.validos || 0), 0);

  // Cadastro × movimento: a pergunta de desenho mais importante da campanha.
  // Se quase tudo vem de cadastro, ela está premiando quem se inscreve, não
  // quem compra — e aí não move pedido, que é o objetivo.
  const deCadastro = porTipo.filter((x) => x.origem === 'cadastro')
    .reduce((s, x) => s + Number(x.validos || 0), 0);
  const pctCadastro = totalValidos > 0 ? Math.round((deCadastro / totalValidos) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-orange-500" />
            {c.nome}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {c.premio} — {brl(c.valor_premio)} · 1 número a cada {brl(c.reais_por_numero)}
            {c.numero_no_cadastro ? ' · 1 número no cadastro' : ''}
          </p>
        </div>
        <button onClick={carregar}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {erro}
        </div>
      )}

      {/* ESTADO DA CAMPANHA.
          O aviso jurídico fica JUNTO do botão, não numa página de ajuda: é no
          instante do clique que ele precisa ser lido. */}
      <div className={`rounded-xl border p-5 ${
        c.ligada ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className={`font-semibold ${c.ligada ? 'text-green-900' : 'text-gray-800'}`}>
              {c.ligada ? 'Campanha LIGADA — gerando números' : 'Campanha desligada'}
            </p>
            {c.ligada ? (
              <p className="text-sm text-green-800 mt-1">
                Cada pedido entregue, venda e entrega concluída gera número.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Nenhum número é gerado enquanto estiver assim. Sorteio de prêmio exige{' '}
                <strong>autorização prévia</strong> do Ministério da Fazenda
                (Lei 5.768/1971) — ligue apenas depois que ela sair.
              </p>
            )}
          </div>
          <button
            onClick={() => alternar(!c.ligada)}
            disabled={salvando}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                        disabled:opacity-50 ${c.ligada
                          ? 'border border-red-300 text-red-700 hover:bg-red-50'
                          : 'bg-orange-600 text-white hover:bg-orange-700'}`}
          >
            <Power className="w-4 h-4" />
            {salvando ? 'Salvando…' : c.ligada ? 'Desligar campanha' : 'Ligar campanha'}
          </button>
        </div>
      </div>

      {/* APURAÇÃO — primeiro, porque no dia do sorteio é a única coisa que importa. */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Apuração</h2>
        <form onSubmit={buscar} className="flex gap-2 max-w-xl">
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Número sorteado ou nome da pessoa"
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-300 outline-none"
          />
          <button type="submit" disabled={buscando}
            className="px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
            <Search className="w-4 h-4" /> {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {achados && achados.length === 0 && (
          <p className="mt-4 text-sm text-gray-600">
            Nada encontrado. Se for um número, ele não foi emitido.
          </p>
        )}

        {achados && achados.length > 0 && (
          <div className="mt-4 space-y-2">
            {achados.map((a) => (
              <div key={`${a.numero}`}
                className={`rounded-xl border p-4 ${a.cancelado_em
                  ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                      nº {a.numero}
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      <strong>{a.nome}</strong> · {ROTULO_TIPO[a.tipo] || a.tipo} ·{' '}
                      por {ROTULO_ORIGEM[a.origem] || a.origem}
                    </p>
                  </div>
                  {/* NÚMERO CANCELADO NÃO GANHA — e isso precisa gritar na hora
                      da apuração, não ser descoberto depois. */}
                  {a.cancelado_em ? (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      CANCELADO — não vale
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-green-700">válido</span>
                  )}
                </div>
                {a.cancelado_em && a.motivo_cancel && (
                  <p className="text-xs text-red-700 mt-2">Motivo: {a.motivo_cancel}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ACOMPANHAMENTO */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Números emitidos ({totalValidos})
        </h2>

        {totalValidos === 0 ? (
          <p className="text-sm text-gray-600">
            Nenhum número ainda{c.ligada ? '.' : ' — a campanha está desligada.'}
          </p>
        ) : (
          <>
            {/* O alerta de desenho: campanha que premia cadastro não move pedido. */}
            {pctCadastro >= 60 && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                <p className="font-semibold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {pctCadastro}% dos números vieram de cadastro, não de movimento
                </p>
                <p className="text-amber-800 mt-1">
                  Assim quem se inscreve e nunca pede tem quase a mesma chance de quem
                  pede toda semana. Se o objetivo é mover pedido, o número do cadastro
                  precisa pesar menos que o da compra.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Público</th>
                    <th className="text-left px-4 py-2.5 font-medium">Origem</th>
                    <th className="text-right px-4 py-2.5 font-medium">Válidos</th>
                    <th className="text-right px-4 py-2.5 font-medium">Cancelados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {porTipo.map((x) => (
                    <tr key={`${x.tipo}-${x.origem}`}>
                      <td className="px-4 py-2.5">{ROTULO_TIPO[x.tipo] || x.tipo}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {ROTULO_ORIGEM[x.origem] || x.origem}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{x.validos}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                        {x.cancelados}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* RANKING — é aqui que a arbitragem aparece. */}
      {ranking.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Quem tem mais números</h2>
          <p className="text-xs text-gray-500 mb-3">
            Alguém muito à frente dos outros merece uma olhada: quem é cliente{' '}
            <em>e</em> dono de loja pode estar girando pedido na própria loja para
            gerar número dos dois lados.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">#</th>
                  <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                  <th className="text-left px-4 py-2.5 font-medium">Público</th>
                  <th className="text-right px-4 py-2.5 font-medium">Números</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ranking.map((x, i) => (
                  <tr key={`${x.tipo}-${x.perfil_id}`}>
                    <td className="px-4 py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{x.nome}</td>
                    <td className="px-4 py-2.5 text-gray-600">{ROTULO_TIPO[x.tipo] || x.tipo}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {x.numeros}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
