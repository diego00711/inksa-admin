// Indicações do Dia I — quem a cidade acha que deve receber o lucro.
//
// Ideia do Diego (21/08/2026): em vez de o escritório escolher o destino da
// doação, deixar cliente, parceiro e entregador indicarem.
//
// A JANELA É UMA CHAVE PRÓPRIA, não a fase do evento — e isso é o ponto. Ele
// abre cerca de um mês antes de propósito: chegar no Dia I ainda decidindo o
// destino é chegar tarde demais pra falar com a instituição e combinar a
// entrega. Por isso o botão daqui não depende de haver evento acontecendo.
//
// O `motivo` aparece junto com a contagem porque numa escolha dessas o texto
// costuma pesar mais que o número. "A creche da minha rua ficou sem gás"
// decide de um jeito que sete votos anônimos não decidem.
import React, { useCallback, useEffect, useState } from 'react';
import {
  HeartHandshake, Loader2, RefreshCw, Check, Star, AlertTriangle, Users,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';

const cab = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${authService.getToken()}`,
});

function quando(iso) {
  if (!iso) return '—';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function IndicacoesDiaI({ bannerVisivel }) {
  const [aberta, setAberta] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mexendo, setMexendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/social/nominations`, { headers: cab() });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Falha ao carregar');
      setAberta(Boolean(j.aberta));
      setLinhas(j.indicacoes || []);
    } catch (e) {
      setAviso({ ok: false, texto: e.message || 'Falha ao carregar indicações.' });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const alternar = async () => {
    setMexendo(true);
    setAviso(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/social/nominations/abrir`, {
        method: 'POST', headers: cab(), body: JSON.stringify({ aberta: !aberta }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não deu.');
      setAberta(Boolean(j.aberta));
      setAviso({ ok: true, texto: j.message });
    } catch (e) {
      setAviso({ ok: false, texto: e.message || 'Falha de rede.' });
    } finally {
      setMexendo(false);
    }
  };

  const escolher = async (l) => {
    setMexendo(true);
    setAviso(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/social/nominations/escolher`, {
        method: 'POST', headers: cab(),
        body: JSON.stringify({ nome_chave: l.nome_chave, escolhida: !l.escolhida }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Não deu.');
      // Só uma pode estar escolhida: reflete isso na tela sem recarregar, pra
      // a lista não pular debaixo do cursor.
      setLinhas((atual) => atual.map((x) => ({
        ...x,
        escolhida: x.nome_chave === l.nome_chave ? !l.escolhida : false,
      })));
    } catch (e) {
      setAviso({ ok: false, texto: e.message || 'Falha de rede.' });
    } finally {
      setMexendo(false);
    }
  };

  const totalVotos = linhas.reduce((s, l) => s + (l.votos || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-500" /> Indicações da cidade
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Com a chave ligada, aparece nos três apps uma caixa para o usuário
            indicar quem deve receber o lucro do Dia I. Abra com algumas semanas
            de antecedência — chegar no dia do evento ainda decidindo o destino
            não dá tempo de falar com a instituição.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={carregar}
            className="p-2 rounded border border-gray-300 text-gray-500 hover:bg-gray-50"
            aria-label="Atualizar"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={alternar}
            disabled={mexendo}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              aberta ? 'bg-gray-700 hover:bg-gray-800' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {mexendo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {aberta ? 'Fechar indicações' : 'Abrir indicações'}
          </button>
        </div>
      </div>

      {/* A caixa mora DENTRO do banner do Dia I. Com o banner escondido, abrir
          as indicações não mostra nada em app nenhum — e sem este aviso o
          Diego ia abrir, olhar o app e achar que o recurso não funciona. */}
      {aberta && !bannerVisivel && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          As indicações estão abertas, mas o banner do Dia I está desligado nos
          apps — e a caixa aparece dentro dele. Ligue “Mostrar nos apps” ali em
          cima, senão ninguém vai ver.
        </p>
      )}

      {aviso && (
        <p className={`text-sm rounded-lg border px-3 py-2 ${
          aviso.ok ? 'bg-green-50 border-green-200 text-green-800'
                   : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {aviso.texto}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500 py-3">Carregando indicações…</p>
      ) : linhas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          {aberta
            ? 'Nenhuma indicação ainda. Assim que alguém indicar pelo app, aparece aqui.'
            : 'Nenhuma indicação registrada.'}
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Users size={13} /> {totalVotos} {totalVotos === 1 ? 'indicação' : 'indicações'} de{' '}
            {linhas.length} {linhas.length === 1 ? 'instituição' : 'instituições'}
          </p>
          <div className="space-y-2">
            {linhas.map((l) => (
              <div
                key={l.nome_chave}
                className={`rounded-lg border p-3 ${
                  l.escolhida ? 'border-rose-300 bg-rose-50' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      {l.escolhida && <Star size={15} className="text-rose-500 fill-rose-500 shrink-0" />}
                      {l.nome}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-bold text-rose-600 text-sm tabular-nums">{l.votos}</span>
                      {' '}{l.votos === 1 ? 'indicação' : 'indicações'} · última {quando(l.ultimo)}
                      {l.contato ? ` · ${l.contato}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => escolher(l)}
                    disabled={mexendo}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                      l.escolhida
                        ? 'border border-rose-300 text-rose-700 hover:bg-rose-100'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Check size={13} />
                    {l.escolhida ? 'Escolhida' : 'Escolher esta'}
                  </button>
                </div>

                {l.motivos?.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                    {l.motivos.map((m, i) => (
                      <li key={i} className="text-sm text-gray-600 italic">“{m}”</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Marcar “Escolhida” só anota qual indicação virou o destino — não
            fecha a votação nem apaga as outras. O valor doado continua sendo
            registrado no evento, ali embaixo.
          </p>
        </>
      )}
    </div>
  );
}
