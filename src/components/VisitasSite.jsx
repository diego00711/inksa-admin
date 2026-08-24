// Visitas do site institucional (inksadelivery.com.br).
//
// A pergunta que essa tela responde não é "quantas visitas" — é DE ONDE. Total
// sobe e desce sem dizer o que fazer; origem diz onde investir a próxima hora.
// Quando o Diego fizer um post no Instagram ou pagar um influenciador, é aqui
// que ele descobre se aquilo trouxe alguém.
//
// Medição própria, sem serviço de terceiro: o site tem política de privacidade
// prometendo que os dados são da Inksa. Não guarda IP nem nada que identifique
// pessoa — só um id sorteado no navegador, pra separar quem voltou de quem
// chegou agora.
//
// `visitas` conta sessões, `únicos` conta pessoas. As duas juntas dizem se o
// site traz gente nova ou a mesma gente voltando — situações opostas que dão o
// mesmo total.
import React, { useCallback, useEffect, useState } from 'react';
import { Globe, RefreshCw, Users, Smartphone, Monitor, ArrowUpRight } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';

const NOMES = {
  direto: 'Direto (digitou ou salvou)',
  'l.instagram.com': 'Instagram',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'lm.facebook.com': 'Facebook',
  'facebook.com': 'Facebook',
  'www.google.com': 'Google',
  'google.com': 'Google',
  'com.google.android.googlequicksearchbox': 'Google (app)',
  'api.whatsapp.com': 'WhatsApp',
  'web.whatsapp.com': 'WhatsApp',
};

export default function VisitasSite() {
  const [d, setD] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/site-visitas?dias=30`, {
        headers: { Authorization: `Bearer ${authService.getToken()}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Falha ao carregar');
      setD(j);
    } catch (e) {
      setErro(e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const r = d?.resumo;
  const maiorDia = Math.max(1, ...(d?.serie || []).map((s) => s.visitas));
  const totalOrigem = Math.max(1, (d?.origens || []).reduce((s, o) => s + o.visitas, 0));

  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-gray-800">
            <Globe className="h-5 w-5 text-orange-500" /> Visitas do site
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            inksadelivery.com.br · medição própria, sem cookie e sem IP.
            Uma pessoa conta uma visita a cada 30 minutos.
          </p>
        </div>
        <button
          onClick={carregar}
          className="rounded border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
          aria-label="Atualizar"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {carregando && !d && <p className="mt-4 text-sm text-gray-500">Carregando…</p>}

      {d && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Caixa titulo="Últimas 24h" valor={r.visitas_24h} nota={`${r.unicos_24h} pessoas`} />
            <Caixa titulo="7 dias" valor={r.visitas_7d} nota={`${r.unicos_7d} pessoas`} />
            <Caixa titulo="Total" valor={r.visitas_total} nota={`${r.unicos_total} pessoas`} />
            <Caixa
              titulo="Celular"
              valor={`${pct(d.dispositivos, 'celular')}%`}
              nota="do acesso dos 30 dias"
              icone={pct(d.dispositivos, 'celular') >= 50 ? Smartphone : Monitor}
            />
          </div>

          {r.visitas_total === 0 ? (
            <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
              Nenhuma visita registrada ainda. A contagem começa a partir de agora —
              o que aconteceu antes de o medidor entrar no ar não dá pra recuperar.
            </p>
          ) : (
            <>
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  De onde vieram · 30 dias
                </p>
                <ul className="space-y-1.5">
                  {d.origens.map((o) => (
                    <li key={o.origem} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-gray-700">
                        {NOMES[o.origem] || o.origem}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <span
                          className="block h-full rounded-full bg-orange-500"
                          style={{ width: `${Math.round((o.visitas / totalOrigem) * 100)}%` }}
                        />
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm tabular-nums text-gray-600">
                        {o.visitas}
                        <span className="text-xs text-gray-400"> · {o.unicos} pes.</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Série diária: o total sozinho é um número solto. É a barra de
                  ontem que diz se a campanha de ontem fez efeito. */}
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Dia a dia
                </p>
                <div className="flex h-24 items-end gap-1">
                  {d.serie.map((s) => (
                    <div
                      key={s.dia}
                      title={`${s.dia.split('-').reverse().join('/')} — ${s.visitas} visitas, ${s.unicos} pessoas`}
                      className="flex-1 rounded-t bg-orange-400/80 hover:bg-orange-500"
                      style={{ height: `${Math.max(4, (s.visitas / maiorDia) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <a
            href="https://www.inksadelivery.com.br"
            target="_blank" rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:underline"
          >
            Abrir o site <ArrowUpRight size={14} />
          </a>
        </>
      )}
    </div>
  );
}

function pct(lista, qual) {
  const total = (lista || []).reduce((s, x) => s + x.visitas, 0);
  if (!total) return 0;
  const n = (lista.find((x) => x.dispositivo === qual) || {}).visitas || 0;
  return Math.round((n / total) * 100);
}

function Caixa({ titulo, valor, nota, icone: Icone = Users }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        <Icone size={12} /> {titulo}
      </p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">{valor}</p>
      <p className="text-xs text-gray-400">{nota}</p>
    </div>
  );
}
