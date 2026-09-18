// src/components/EntregadoresAgoraModal.jsx
//
// A LISTA POR TRÁS DO CARD "ENTREGADORES APTOS" (17/09/2026).
//
// O card dizia "1 de 1 — Todos os online recebem pedido" e parava ali. No dia
// em que esta janela nasceu, esse "1" estava online desde a tarde e sem dar
// sinal de vida havia 5 horas: recebia oferta e ninguém via. O número estava
// certo e escondia justamente o que importava.
//
// ## O QUE A COLUNA "ÚLTIMO SINAL" QUER DIZER
//
// O app do entregador bate no servidor a cada 2 minutos enquanto a tela está
// ligada. Então:
//   ≤ 5 min → app aberto agora
//   ≤ 3 h   → app em segundo plano (celular no bolso, outro app por cima)
//   > 3 h   → sem sinal
//
// ⚠️ O MOTOR DE DESPACHO NÃO OLHA O SINAL — só o botão de online. Quem está
// online e sem sinal há horas continua recebendo oferta, e cada uma queima 60 s
// antes de passar pro próximo. É o único caso em que esta tela chama atenção
// em vermelho, porque é o único em que dá pra agir: mandar mensagem pra ele.
//
// A régua do "apto" (localização + cadastro completo) é a MESMA do número do
// card — as duas saem do mesmo SQL no backend. Se cada uma tivesse a sua, um
// dia o card diria 2 e a lista mostraria 1.
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X, RefreshCw, MessageCircle, AlertTriangle } from 'lucide-react';
import authService from '../services/authService';
import { API_BASE_URL } from '../services/api';
import { mensagemDeErro } from '../utils/mensagemDeErro.js';

const VEICULO = {
  moto: 'Moto', motorcycle: 'Moto', carro: 'Carro', car: 'Carro',
  bike: 'Bicicleta', bicicleta: 'Bicicleta', utilitario: 'Utilitário', outro: 'Outro',
};

// 7 → "7 min" · 135 → "2h15" · 3118 → "2 dias". O número cru ("3118 min")
// obriga a fazer conta de cabeça justamente quando a pessoa quer decidir rápido.
function duracao(min) {
  if (min == null) return null;
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }
  const d = Math.floor(min / (24 * 60));
  return `${d} dia${d === 1 ? '' : 's'}`;
}

function estadoDoSinal(min) {
  if (min == null) return { texto: 'nunca deu sinal', cor: 'text-gray-500', nivel: 'sem' };
  if (min <= 5) return { texto: 'app aberto agora', cor: 'text-emerald-700', nivel: 'ok' };
  if (min <= 180) return { texto: `há ${duracao(min)} · app em segundo plano`, cor: 'text-amber-700', nivel: 'fundo' };
  return { texto: `há ${duracao(min)} sem sinal`, cor: 'text-red-700', nivel: 'sem' };
}

// Número guardado com ou sem o 55 do Brasil. Até 11 dígitos = DDD + número,
// falta o país; o wa.me exige ele.
function linkWhatsApp(telefone) {
  let d = String(telefone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}`;
}

function horaDe(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function LinhaOnline({ e }) {
  const sinal = estadoDoSinal(e.min_sem_sinal);
  // O caso que pede ação: online (logo, recebe oferta) e ninguém do outro lado.
  const fantasma = sinal.nivel === 'sem';
  const wa = linkWhatsApp(e.telefone);

  return (
    <li className={`rounded-lg border p-4 ${fantasma ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{e.nome}</p>
          <p className="text-xs text-gray-500">{VEICULO[e.veiculo] || e.veiculo || '—'}</p>
        </div>
        {e.apto ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Apto
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Não recebe pedido: {e.faltas.join(', ')}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-gray-500">Online há</dt>
          {/* "—" e não um chute: quem já estava online antes de a coluna
              existir não tem o horário, e inventar um seria mentir pra baixo. */}
          <dd className="font-medium tabular-nums text-gray-900">
            {e.min_online != null
              ? <>{duracao(e.min_online)} <span className="text-xs font-normal text-gray-500">(desde {horaDe(e.online_desde)})</span></>
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Último sinal</dt>
          <dd className={`font-medium ${sinal.cor}`}>{sinal.texto}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Entregas hoje</dt>
          <dd className="font-medium tabular-nums text-gray-900">{e.entregas_hoje}</dd>
        </div>
      </dl>

      {(e.em_entrega || e.com_oferta || e.em_pausa_ate || !e.tem_push) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.em_entrega && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Em entrega agora</span>
          )}
          {e.com_oferta && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">Com oferta na mão</span>
          )}
          {e.em_pausa_ate && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              Em pausa por recusa até {horaDe(e.em_pausa_ate)}
            </span>
          )}
          {!e.tem_push && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Notificação desligada
            </span>
          )}
        </div>
      )}

      {fantasma && e.apto && (
        <p className="mt-3 flex gap-2 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Está online, então recebe oferta — mas o app não dá sinal há {duracao(e.min_sem_sinal)}.
            Cada oferta que ele não vê espera 60 s antes de passar pro próximo.
          </span>
        </p>
      )}

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp
        </a>
      )}
    </li>
  );
}

export default function EntregadoresAgoraModal({ onClose }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/entregadores/agora`, {
        headers: { Authorization: `Bearer ${authService.getToken()}` },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Não foi possível carregar.');
      setDados(j);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar os entregadores.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const aoApertar = (ev) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoApertar);
    return () => window.removeEventListener('keydown', aoApertar);
  }, [onClose]);

  const online = dados?.online || [];
  const offline = dados?.offline || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entregadores-titulo"
        className="flex w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl max-h-[90vh]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
          <h2 id="entregadores-titulo" className="text-lg font-semibold text-gray-900">
            Entregadores agora
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={carregar}
              disabled={carregando}
              aria-label="Atualizar"
              className="rounded p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              <RefreshCw className={`h-5 w-5 ${carregando ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} aria-label="Fechar" className="rounded p-1.5 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {carregando && !dados && (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}
          {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

          {dados && (
            <>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Online ({online.length})
              </h3>
              {online.length === 0 ? (
                <p className="mb-6 rounded-md bg-gray-50 p-4 text-sm text-gray-600">
                  Ninguém online agora. Se entrar um pedido, ele espera até alguém ligar o app.
                </p>
              ) : (
                <ul className="mb-6 space-y-3">
                  {online.map((e) => <LinhaOnline key={e.id} e={e} />)}
                </ul>
              )}

              {offline.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Offline · vistos nos últimos 7 dias ({offline.length})
                  </h3>
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {offline.map((e) => {
                      const wa = linkWhatsApp(e.telefone);
                      return (
                        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                          <span className="min-w-0">
                            <span className="font-medium text-gray-900">{e.nome}</span>
                            <span className="ml-2 text-xs text-gray-500">{VEICULO[e.veiculo] || e.veiculo || ''}</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="tabular-nums text-gray-500">
                              visto há {duracao(e.min_sem_sinal) || '—'}
                            </span>
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Chamar ${e.nome} no WhatsApp`}
                                className="text-emerald-700 hover:text-emerald-900"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
