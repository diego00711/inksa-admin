// src/components/AnunciarCupomModal.jsx
//
// JANELA "ANUNCIAR POR NOTIFICAÇÃO" DA TELA DE CUPONS (17/09/2026).
//
// ## POR QUE ELA PERGUNTA ANTES DE ENVIAR
//
// Notificação não tem desfazer. O disparo da oferta relâmpago (tela de
// Banners) é uma sequência de window.prompt e só conta pra quantos foi DEPOIS
// de enviar — o admin aperta no escuro. Aqui a janela abre já sabendo: cada
// público vem com o número de clientes que recebe AGORA, calculado pelo
// servidor com as mesmas travas do envio de verdade (a conta do "simular" e a
// do envio saem da mesma função no backend, então não divergem).
//
// ## POR QUE AS REGRAS NÃO MORAM AQUI
//
// Quem decide o que pode ser anunciado e pra quem é o servidor
// (`_por_que_nao_anunciar` e `_publicos_do_cupom` em coupons_routes.py). A
// tela só mostra o que ele devolve. Repetir as regras aqui criaria duas
// versões da mesma pergunta, e a primeira que ficasse pra trás anunciaria o
// que não devia — o cupom "só digitado" da rádio, ou o de indicação de uma
// pessoa pra todo mundo.
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X, Send, Info } from 'lucide-react';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';
import { useConfirm } from './ConfirmProvider';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

// Texto de cada público. O `detalhe` responde a pergunta que o número sozinho
// não responde: "por que tão poucos?".
function rotuloDe(id, loja) {
  const nomeLoja = loja || 'a loja';
  switch (id) {
    case 'dono':
      return { titulo: 'Só o dono do cupom',
               detalhe: 'É um cupom pessoal (de indicação). Vai como lembrete pra quem ganhou.' };
    case 'ja_pediram':
      return { titulo: `Quem já pediu na ${nomeLoja}`,
               detalhe: 'Converte mais: é um lugar onde a pessoa já comeu.' };
    case 'no_raio':
      return { titulo: `Quem está no raio de entrega da ${nomeLoja}`,
               detalhe: 'Só entra quem tem posição gravada — ainda são poucos clientes.' };
    case 'todos':
      return { titulo: 'Todos os clientes com notificação ligada',
               detalhe: loja ? 'Inclui quem está longe da loja.' : null };
    default:
      return { titulo: id, detalhe: null };
  }
}

export default function AnunciarCupomModal({ cupom, onClose, notify }) {
  const confirm = useConfirm();
  const [carregando, setCarregando] = useState(true);
  const [sim, setSim] = useState(null);          // resposta do "simular"
  const [erro, setErro] = useState('');
  const [publico, setPublico] = useState('');
  const [emailTeste, setEmailTeste] = useState('');
  const [quantos, setQuantos] = useState('');
  const [enviando, setEnviando] = useState(false);

  const chamar = useCallback(async (corpo) => {
    const r = await fetch(`${API_BASE_URL}/api/coupons/admin/${cupom.id}/disparar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authService.getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || 'Não foi possível falar com o servidor.');
    return j?.data || {};
  }, [cupom.id]);

  const simular = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const d = await chamar({ simular: true });
      setSim(d);
      // Pré-seleciona o primeiro público com alguém pra receber. Pré-selecionar
      // um com zero faria o botão nascer desabilitado sem motivo aparente.
      const primeiro = (d.publicos || []).find((p) => p.elegiveis > 0);
      setPublico((atual) => atual || (primeiro ? primeiro.id : 'so_eu'));
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível calcular o público.'));
    } finally {
      setCarregando(false);
    }
  }, [chamar]);

  useEffect(() => { simular(); }, [simular]);

  // Esc fecha. Janela que só fecha no X é armadilha no teclado.
  useEffect(() => {
    const aoApertar = (e) => { if (e.key === 'Escape' && !enviando) onClose(); };
    window.addEventListener('keydown', aoApertar);
    return () => window.removeEventListener('keydown', aoApertar);
  }, [onClose, enviando]);

  const escolhido = (sim?.publicos || []).find((p) => p.id === publico);
  const ehTeste = publico === 'so_eu';
  const lote = Number(quantos) > 0 ? Number(quantos) : 0;
  const vaiReceber = ehTeste ? 1 : Math.min(escolhido?.elegiveis || 0, lote || Infinity);
  const podeEnviar = !enviando && (ehTeste ? emailTeste.trim().length > 3 : vaiReceber > 0);

  const enviar = async () => {
    const quem = ehTeste
      ? `um teste para ${emailTeste.trim()}`
      : `${vaiReceber} cliente${vaiReceber === 1 ? '' : 's'}`;
    const ok = await confirm({
      title: `Anunciar ${cupom.code}?`,
      message: `Vai para ${quem}. Notificação não tem desfazer.`,
    });
    if (!ok) return;

    setEnviando(true);
    try {
      const d = await chamar({
        publico,
        quantos: ehTeste ? 0 : lote,
        email_teste: ehTeste ? emailTeste.trim() : undefined,
      });
      if (d.enviados > 0) {
        notify(
          `Enviado para ${d.enviados} cliente${d.enviados === 1 ? '' : 's'}.`
            + (d.sobraram ? ` Sobraram ${d.sobraram} — envie de novo pro próximo lote.` : '')
            + (d.tokens_limpos ? ` ${d.tokens_limpos} celular(es) sem o app foram limpos da lista.` : ''),
          'success',
        );
        // Recalcula: quem acabou de receber sai da conta, e o próximo envio
        // mostra o número certo em vez do de antes.
        if (!ehTeste) await simular();
      } else {
        notify(d.aviso || (d.erros?.[0] ? `Falhou: ${d.erros[0]}` : 'Ninguém recebeu.'), 'warning');
      }
    } catch (e) {
      notify(mensagemDeErro(e, 'Falha ao enviar a notificação'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !enviando) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="anunciar-titulo"
        className="w-full max-w-md rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 id="anunciar-titulo" className="text-lg font-semibold text-gray-900">
              Anunciar por notificação
            </h2>
            <p className="mt-0.5 font-mono text-sm text-gray-500">{cupom.code}</p>
          </div>
          <button
            onClick={onClose}
            disabled={enviando}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {carregando && (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando quem recebe…
            </div>
          )}

          {!carregando && erro && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>
          )}

          {/* Cupom que não pode ser anunciado: diz o PORQUÊ, não só "não". */}
          {!carregando && sim && !sim.pode && (
            <div className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{sim.motivo}</p>
            </div>
          )}

          {!carregando && sim?.pode && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-gray-700">Pra quem enviar?</legend>

              {(sim.publicos || []).map((p) => {
                const { titulo, detalhe } = rotuloDe(p.id, sim.loja);
                const vazio = p.elegiveis === 0;
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                      publico === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    } ${vazio ? 'opacity-60' : ''}`}
                  >
                    <input
                      type="radio"
                      name="publico"
                      value={p.id}
                      checked={publico === p.id}
                      onChange={() => setPublico(p.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{titulo}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                          {p.elegiveis} {p.elegiveis === 1 ? 'cliente' : 'clientes'}
                        </span>
                      </span>
                      {(p.obs || detalhe) && (
                        <span className="mt-0.5 block text-xs text-gray-500">{p.obs || detalhe}</span>
                      )}
                    </span>
                  </label>
                );
              })}

              <label
                className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                  ehTeste ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="publico"
                  value="so_eu"
                  checked={ehTeste}
                  onChange={() => setPublico('so_eu')}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">Teste num celular só</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Não conta como enviado — depois dá pra mandar de verdade.
                  </span>
                  {ehTeste && (
                    <input
                      type="email"
                      value={emailTeste}
                      onChange={(e) => setEmailTeste(e.target.value)}
                      placeholder="e-mail da conta no APP DO CLIENTE"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}
                </span>
              </label>

              {/* Lote: o controle de custo. Se o cupom tem 10 usos, avisar 50
                  faz 40 levarem "esgotado" na cara. Quem sobra continua na
                  fila — enviar de novo manda pro próximo lote. */}
              {!ehTeste && publico !== 'dono' && (escolhido?.elegiveis || 0) > 1 && (
                <label className="block pt-2">
                  <span className="text-sm text-gray-700">Avisar quantos agora?</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={quantos}
                    onChange={(e) => setQuantos(e.target.value)}
                    placeholder={`todos (${escolhido.elegiveis})`}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm tabular-nums"
                  />
                </label>
              )}

              <div className="space-y-1 pt-3 text-xs text-gray-500">
                {sim.ja_receberam > 0 && (
                  <p>
                    {sim.ja_receberam} {sim.ja_receberam === 1 ? 'cliente já recebeu' : 'clientes já receberam'}{' '}
                    este cupom — cada um recebe uma vez só.
                  </p>
                )}
                <p>
                  Limite de {sim.teto_diario} aviso{sim.teto_diario === 1 ? '' : 's'} por cliente por dia:
                  quem já recebeu outra campanha hoje fica pra amanhã.
                </p>
              </div>
            </fieldset>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            disabled={enviando}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {sim && !sim.pode ? 'Entendi' : 'Cancelar'}
          </button>
          {sim?.pode && (
            <button
              onClick={enviar}
              disabled={!podeEnviar}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {ehTeste
                ? 'Enviar teste'
                : vaiReceber > 0
                  ? `Enviar para ${vaiReceber} ${vaiReceber === 1 ? 'cliente' : 'clientes'}`
                  : 'Ninguém pra receber'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
