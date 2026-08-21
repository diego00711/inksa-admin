import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCw, Image as ImageIcon, Check, Undo2, Phone,
  Download, Copy, Share2, X, Store, AlertTriangle,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import {
  desenharArte, carregarLogo, mensagemProspeccao, FORMATOS, FUNDADOR_ATE,
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
      setErro(e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

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

      <Bloco
        titulo={`Para prospectar (${aProspectar.length})`}
        subtitulo="Não são parceiros ainda. Cada linha é gente que quis pedir e não deu."
        linhas={aProspectar}
        onArte={(l) => setArte({ ...l, modo: 'prospect' })}
        onMarcar={marcar}
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
          marcando={marcando}
          vazio=""
        />
      )}

      {arte && (
        <ModalArte
          linha={arte}
          primeiroNome={(user?.name || user?.full_name || '').trim().split(' ')[0] || ''}
          onFechar={() => setArte(null)}
        />
      )}
    </div>
  );
}

function Bloco({ titulo, subtitulo, linhas, onArte, onMarcar, marcando, vazio, alerta }) {
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

function ModalArte({ linha, primeiroNome, onFechar }) {
  const canvasRef = useRef(null);
  const [formato, setFormato] = useState('post');
  const [logo, setLogo] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  const texto = useMemo(
    () => mensagemProspeccao({
      nome: linha.nome, pedidos: linha.pedidos, modo: linha.modo, primeiroNome,
    }),
    [linha, primeiroNome],
  );

  useEffect(() => { carregarLogo().then(setLogo); }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    desenharArte(canvasRef.current, {
      nome: linha.nome, pedidos: linha.pedidos, modo: linha.modo, formato, logo,
    });
  }, [linha, formato, logo]);

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

  const compartilhar = async () => {
    const f = await arquivo();
    try { await navigator.share({ files: [f], text }); } catch { /* cancelou */ }
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

  const fundadorVale = new Date() <= FUNDADOR_ATE;

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
            {!fundadorVale && linha.modo !== 'parceiro' && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                O prazo do Parceiro Fundador já passou, então a arte e o texto
                mudaram sozinhos para a proposta normal. Se a campanha foi
                estendida, mude a data em <code>arteProspeccao.js</code>.
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
