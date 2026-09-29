import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCw, Image as ImageIcon, Check, Undo2, Phone,
  Download, Copy, Share2, X, Store, AlertTriangle, Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';
import {
  desenharArte, carregarLogo, mensagemProspeccao, FORMATOS,
  OFERTAS_PRONTAS, OFERTA_PADRAO, CHAVE_OFERTA, ofertaVigente,
} from '../utils/arteProspeccao';

/**
 * Prospecção — a fila que se constrói sozinha.
 *
 * Quando o cliente abre o app e não acha o que queria, ele digita o nome. Cada
 * nome desses é um pedido de compra que a Inksa não conseguiu atender, e o
 * contador diz quantas vezes. É a lista mais honesta de "para quem ligar
 * amanhã" que existe: não é palpite, é demanda que já aconteceu.
 *
 * A tela separa DOIS problemas que a mesma lista mistura:
 *
 *   • quem NÃO é parceiro   → falta a loja. É prospecção de verdade.
 *   • quem JÁ É parceiro     → a loja existe e o cliente não achou. Aí o
 *     problema é cardápio vazio, loja fechada ou sem coordenada. Ligar pra
 *     esse oferecendo parceria seria constrangedor — e não resolveria nada.
 *
 * A ARTE é o motivo desta tela existir. "Sete clientes meus procuraram vocês"
 * dito por telefone é conversa; a mesma frase numa peça que o dono da loja
 * recebe no WhatsApp é prova. O número vem do banco, nunca é digitado.
 */

function quando(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString('pt-BR');
}

export default function ProspeccaoPage() {
  const { user } = useAuth();
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [ocultarAtendidas, setOcultarAtendidas] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [marcando, setMarcando] = useState(null);
  const [apagando, setApagando] = useState(null);   // nome_chave em confirmação
  const [arte, setArte] = useState(null);   // linha aberta no modal

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/sugestoes`, {
        headers: { Authorization: `Bearer ${authService.getToken()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || j?.message || 'Falha ao carregar');
      setLinhas(j.sugestoes || []);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Falha ao carregar'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // A oferta vigente. Fica no mesmo lugar que todo o resto das configurações
  // (platform_settings, via o endpoint genérico), então trocar a campanha não
  // é mais mexer em código.
  const [oferta, setOferta] = useState(OFERTA_PADRAO);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${authService.getToken()}` },
        });
        const j = await r.json();
        const guardada = j?.data?.[CHAVE_OFERTA];
        if (guardada) setOferta(ofertaVigente(guardada));
      } catch { /* sem settings: segue na proposta padrão */ }
    })();
  }, []);

  const marcar = async (l, atendida) => {
    setMarcando(l.nome_chave);
    setAviso(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/sugestoes/atendida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({ nome_chave: l.nome_chave, atendida }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não deu.');
      setAviso({ ok: true, texto: j.message || 'Pronto.' });
      // Atualiza local em vez de recarregar: a lista é ordenada por demanda e
      // recarregar faz a linha pular da tela debaixo do cursor.
      setLinhas((atual) => atual.map((x) =>
        x.nome_chave === l.nome_chave ? { ...x, atendida } : x));
    } catch (e) {
      setAviso({ ok: false, texto: e.message || 'Falha de rede.' });
    } finally {
      setMarcando(null);
    }
  };

  // Apagar é para ENTULHO: erro de digitação que virou loja nova. Não é o
  // mesmo que "já atendi" — atendida sai da fila e mantém o histórico; isto
  // some de vez, e não tem volta.
  const apagar = async (l) => {
    setMarcando(l.nome_chave);
    setAviso(null);
    try {
      const r = await fetch(
        `${API_BASE_URL}/api/admin/sugestoes?nome_chave=${encodeURIComponent(l.nome_chave)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${authService.getToken()}` } },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não deu.');
      setLinhas((atual) => atual.filter((x) => x.nome_chave !== l.nome_chave));
      setAviso({ ok: true, texto: j.message });
    } catch (e) {
      setAviso({ ok: false, texto: e.message || 'Falha de rede.' });
    } finally {
      setMarcando(null);
      setApagando(null);
    }
  };

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (ocultarAtendidas && l.atendida) return false;
      if (t && !String(l.nome || '').toLowerCase().includes(t)) return false;
      return true;
    });
  }, [linhas, busca, ocultarAtendidas]);

  const aProspectar = filtradas.filter((l) => !l.ja_existe);
  const invisiveis  = filtradas.filter((l) => l.ja_existe);
  const totalPedidos = aProspectar.reduce((s, l) => s + (l.pedidos || 0), 0);

  if (carregando) return <div className="p-8 text-gray-500">Carregando a fila…</div>;
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Search size={22} /> Prospecção
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Lojas que os clientes digitaram no app e não encontraram. São{' '}
            <strong className="text-gray-700">{totalPedidos}</strong> pedidos de compra
            que a Inksa não conseguiu atender — em ordem de quem foi mais procurado.
          </p>
        </div>
        <button
          onClick={carregar}
          className="flex shrink-0 items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pelo nome"
          className="min-h-[40px] flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-orange-500"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={ocultarAtendidas}
            onChange={(e) => setOcultarAtendidas(e.target.checked)}
            className="h-4 w-4 accent-orange-500"
          />
          Esconder as que já atendi
        </label>
      </div>

      {aviso && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${
          aviso.ok ? 'border-green-200 bg-green-50 text-green-800'
                   : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {aviso.texto}
        </p>
      )}

      <EditorDaOferta oferta={oferta} onMudou={setOferta} />

      <Bloco
        titulo={`Para prospectar (${aProspectar.length})`}
        subtitulo="Não são parceiros ainda. Cada linha é gente que quis pedir e não deu."
        linhas={aProspectar}
        onArte={(l) => setArte({ ...l, modo: 'prospect' })}
        onMarcar={marcar}
        onApagar={apagar}
        apagando={apagando}
        setApagando={setApagando}
        marcando={marcando}
        vazio="Ninguém sugeriu nada ainda. Assim que um cliente digitar um nome no app, ele aparece aqui."
      />

      {invisiveis.length > 0 && (
        <Bloco
          titulo={`Já são parceiros, mas não foram achados (${invisiveis.length})`}
          subtitulo="A loja existe no sistema e o cliente não encontrou. Costuma ser cardápio vazio, loja fechada ou endereço sem coordenada — não é prospecção, é conserto."
          alerta
          linhas={invisiveis}
          onArte={(l) => setArte({ ...l, modo: 'parceiro' })}
          onMarcar={marcar}
          onApagar={apagar}
          apagando={apagando}
          setApagando={setApagando}
          marcando={marcando}
          vazio=""
        />
      )}

      {arte && (
        <ModalArte
          linha={arte}
          oferta={oferta}
          primeiroNome={(user?.name || user?.full_name || '').trim().split(' ')[0] || ''}
          onFechar={() => setArte(null)}
        />
      )}
    </div>
  );
}

function Bloco({ titulo, subtitulo, linhas, onArte, onMarcar, onApagar,
                apagando, setApagando, marcando, vazio, alerta }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        {alerta ? <AlertTriangle size={17} className="text-amber-500" /> : <Store size={17} />}
        {titulo}
      </h2>
      <p className="mb-3 max-w-3xl text-xs text-gray-500">{subtitulo}</p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {linhas.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">{vazio}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="p-3 font-medium">Loja</th>
                <th className="p-3 font-medium">Procuraram</th>
                <th className="p-3 font-medium">Última vez</th>
                <th className="p-3 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linhas.map((l) => (
                <tr key={l.nome_chave} className={l.atendida ? 'opacity-60' : ''}>
                  <td className="p-3">
                    <span className="block font-medium text-gray-800">{l.nome}</span>
                    {l.contato ? (
                      <a
                        href={`https://wa.me/55${String(l.contato).replace(/\D/g, '')}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Phone size={11} /> {l.contato}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">sem contato</span>
                    )}
                    {l.atendida && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                        já atendi
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-lg font-bold tabular-nums text-orange-600">{l.pedidos}</span>
                    <span className="text-xs text-gray-400">
                      {' '}{l.pedidos === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{quando(l.ultimo)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onArte(l)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                      >
                        <ImageIcon size={13} /> Arte
                      </button>
                      <button
                        onClick={() => onMarcar(l, !l.atendida)}
                        disabled={marcando === l.nome_chave}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {l.atendida ? <Undo2 size={13} /> : <Check size={13} />}
                        {l.atendida ? 'Voltar pra fila' : 'Já atendi'}
                      </button>

                      {/* Confirmação em dois toques em vez de modal: não
                          esconde a tabela e some ao cancelar. */}
                      {apagando === l.nome_chave ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => onApagar(l)}
                            disabled={marcando === l.nome_chave}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {marcando === l.nome_chave ? '...' : 'Apagar'}
                          </button>
                          <button
                            onClick={() => setApagando(null)}
                            className="px-2 py-1.5 text-xs text-gray-500 hover:underline"
                          >
                            cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setApagando(l.nome_chave)}
                          title="Apaga de vez. Use para erro de digitação que virou loja nova."
                          className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          aria-label="Apagar sugestão"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ModalArte({ linha, primeiroNome, oferta, onFechar }) {
  const canvasRef = useRef(null);
  const [formato, setFormato] = useState('post');
  const [logo, setLogo] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  const texto = useMemo(
    () => mensagemProspeccao({
      nome: linha.nome, pedidos: linha.pedidos, modo: linha.modo, primeiroNome, oferta,
    }),
    [linha, primeiroNome, oferta],
  );

  useEffect(() => { carregarLogo().then(setLogo); }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    desenharArte(canvasRef.current, {
      nome: linha.nome, pedidos: linha.pedidos, modo: linha.modo, formato, logo, oferta,
    });
  }, [linha, formato, logo, oferta]);

  useEffect(() => {
    // navigator.share com arquivo só existe no celular. No desktop o caminho é
    // baixar e arrastar pro WhatsApp — dizer isso é melhor que mostrar um
    // botão que não faz nada.
    try {
      const f = new File([new Blob()], 't.png', { type: 'image/png' });
      setPodeCompartilhar(Boolean(navigator.canShare && navigator.canShare({ files: [f] })));
    } catch { setPodeCompartilhar(false); }
  }, []);

  const arquivo = () => new Promise((resolve) => {
    canvasRef.current.toBlob((b) => {
      const slug = String(linha.nome_chave || 'loja').replace(/\s+/g, '-').slice(0, 40);
      resolve(new File([b], `inksa-${slug}-${formato}.png`, { type: 'image/png' }));
    }, 'image/png');
  });

  const baixar = async () => {
    const f = await arquivo();
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // ⚠️ `text: texto`, NÃO `text`. Estava `{ files: [f], text }` — atalho de
  // propriedade apontando pra uma variável `text` que não existe (a daqui se
  // chama `texto`). Isso lança ReferenceError DENTRO do try, e o catch vazio
  // abaixo engolia como se a pessoa tivesse cancelado. Resultado: o botão
  // Compartilhar nunca compartilhou nada, sem erro nenhum na tela.
  //
  // Achado em 17/09/2026, e só porque o eslint deste app finalmente RODOU:
  // ele usa config no formato novo e recusava os parâmetros das varreduras
  // anteriores em silêncio — o "nenhum erro" do admin era o eslint nem ter
  // começado.
  const compartilhar = async () => {
    const f = await arquivo();
    try { await navigator.share({ files: [f], text: texto }); } catch { /* cancelou */ }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* sem permissão de área de transferência */ }
  };

  const zap = linha.contato
    ? `https://wa.me/55${String(linha.contato).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  // Campanha configurada existia, mas o prazo passou e a arte caiu no padrão.
  const venceu = !!(oferta?.ate) && ofertaVigente(oferta).chave === 'padrao';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{linha.nome}</h3>
            <p className="text-sm text-gray-500">
              {linha.pedidos} {linha.pedidos === 1 ? 'pessoa procurou' : 'pessoas procuraram'}
              {' '}· o número sai do banco, ninguém digita
            </p>
          </div>
          <button onClick={onFechar} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[300px_1fr]">
          <div>
            <div className="mb-3 flex gap-2">
              {Object.entries(FORMATOS).map(([k, f]) => (
                <button
                  key={k}
                  onClick={() => setFormato(k)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    formato === k ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
            <canvas
              ref={canvasRef}
              className="w-full rounded-xl border border-gray-200 shadow-sm"
            />
          </div>

          <div className="space-y-4">
            {venceu && linha.modo !== 'parceiro' && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                O prazo da campanha já passou, então a arte e o texto voltaram
                sozinhos para a proposta padrão. Se ela foi estendida, mude a
                data em <strong>Oferta que vai na arte</strong>, no topo desta
                página.
              </p>
            )}

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Texto pra mandar junto
              </p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 font-sans text-sm text-gray-700">
                {texto}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={baixar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <Download size={15} /> Baixar PNG
              </button>
              {podeCompartilhar && (
                <button
                  onClick={compartilhar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  <Share2 size={15} /> Compartilhar
                </button>
              )}
              <button
                onClick={copiar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Copy size={15} /> {copiado ? 'Copiado' : 'Copiar texto'}
              </button>
              <a
                href={zap}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
              >
                <Phone size={15} /> Abrir no WhatsApp
              </a>
            </div>

            <p className="text-xs text-gray-400">
              O WhatsApp abre só com o texto — a imagem vai anexada à mão depois
              de baixar. No celular, o botão Compartilhar manda os dois juntos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Escolhe e edita a oferta que vai na arte e no texto do WhatsApp.
 *
 * ⚠️ EXISTE PORQUE A OFERTA ESTAVA CRAVADA NO CÓDIGO. A data do Parceiro
 * Fundador era uma constante em `arteProspeccao.js`, e a própria tela mandava
 * "mude a data no arquivo". Em setembro a campanha virou (repasse zero até
 * 31/12), o prazo antigo venceu e a peça passou semanas oferecendo 15% de
 * comissão enquanto o anúncio prometia outra coisa. Oferta que só o programador
 * troca é oferta que envelhece na mão de quem vende.
 *
 * O prazo continua obrigatório em espírito: passou a data, a arte cai sozinha
 * na proposta padrão. Promessa vencida entregue ao dono da loja custa mais caro
 * que a peça inteira vale.
 */
function EditorDaOferta({ oferta, onMudou }) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(oferta);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => { setRascunho(oferta); }, [oferta]);

  const vigente = ofertaVigente(rascunho);
  const venceu = !!rascunho?.ate && vigente.chave === 'padrao';

  const campo = (k) => (e) => setRascunho({ ...rascunho, [k]: e.target.value, chave: 'custom' });

  const salvar = async () => {
    setSalvando(true);
    setAviso(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({ [CHAVE_OFERTA]: JSON.stringify(rascunho) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || j?.message || 'Falha ao salvar');
      onMudou(rascunho);
      setAviso({ ok: true, texto: 'Oferta salva. A arte e o texto já saem com ela.' });
    } catch (e) {
      setAviso({ ok: false, texto: mensagemDeErro(e, 'Falha ao salvar') });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Oferta que vai na arte</p>
          <p className="truncate text-xs text-gray-500">
            {venceu
              ? `Prazo vencido — saindo a proposta padrão: “${vigente.titulo}”`
              : `“${vigente.titulo}”${rascunho?.ate ? ` · até ${rascunho.ate.split('-').reverse().join('/')}` : ' · sem prazo'}`}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-orange-600">
          {aberto ? 'Fechar' : 'Editar'}
        </span>
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            {OFERTAS_PRONTAS.map((o) => (
              <button
                key={o.chave}
                onClick={() => setRascunho(o)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  rascunho?.chave === o.chave
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {o.nome}
              </button>
            ))}
          </div>

          {venceu && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              O prazo desta oferta já passou, então a arte está saindo com a
              proposta padrão. Estenda a data ou escolha outra campanha.
            </p>
          )}

          <Campo rotulo="Etiqueta (maiúsculas, no topo da faixa)"
                 valor={rascunho?.rotulo || ''} onChange={campo('rotulo')} />
          <Campo rotulo="Título (a frase grande)"
                 valor={rascunho?.titulo || ''} onChange={campo('titulo')} />
          <Campo rotulo="Linha de apoio"
                 valor={rascunho?.sub || ''} onChange={campo('sub')} area />
          <Campo rotulo="Como isso é dito no WhatsApp"
                 valor={rascunho?.zap || ''} onChange={campo('zap')} area />

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Vale até (vazio = sem prazo)
            </label>
            <input
              type="date"
              value={rascunho?.ate || ''}
              onChange={campo('ate')}
              className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Passada a data, a arte volta sozinha para a proposta padrão — de
              propósito. Ninguém lembra de desligar campanha.
            </p>
          </div>

          {aviso && (
            <p className={`rounded-lg border px-3 py-2 text-sm ${
              aviso.ok ? 'border-green-200 bg-green-50 text-green-800'
                       : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {aviso.texto}
            </p>
          )}

          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Salvar oferta'}
          </button>
        </div>
      )}
    </div>
  );
}

function Campo({ rotulo, valor, onChange, area }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
        {rotulo}
      </label>
      {area ? (
        <textarea
          value={valor}
          onChange={onChange}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
      ) : (
        <input
          value={valor}
          onChange={onChange}
          className="min-h-[40px] w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-orange-500"
        />
      )}
    </div>
  );
}
