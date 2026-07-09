import React, { useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/authService';
import {
  HeartHandshake, Save, Loader2, RefreshCw, CalendarDays, Clock,
  Smartphone, CheckCircle2, Radio, Hourglass, Flag,
  History, Trash2, Plus, ExternalLink,
} from 'lucide-react';

const inputCls = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500';

const money = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Linha editável do histórico (prestação de contas de um Dia I)
function EventRow({ event, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    destination: event.destination || '',
    proof_url: event.proof_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authService.updateSocialEvent(event.id, form);
      onSaved(res?.data || { ...event, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(e.message || 'Erro ao salvar evento.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remover este evento do histórico público?')) return;
    try {
      await authService.deleteSocialEvent(event.id);
      onDeleted(event.id);
    } catch (e) {
      alert(e.message || 'Erro ao remover evento.');
    }
  };

  const dateBr = event.date ? event.date.split('-').reverse().join('/') : '—';

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{dateBr}</span>
          <span className="text-xs text-gray-500">{event.start_time || '—'} – {event.end_time || '—'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-rose-600">{money(event.raised)}</span>
          <span className="text-xs text-gray-500">{event.orders_count} pedido(s)</span>
          <button onClick={remove} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Remover">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Destino da doação (aparece na página pública)</label>
          <input
            className={inputCls}
            placeholder="Ex.: Cestas básicas — Lar São Vicente"
            value={form.destination}
            onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Link de comprovante/postagem (opcional)</label>
          <input
            className={inputCls}
            placeholder="https://..."
            value={form.proof_url}
            onChange={(e) => setForm((f) => ({ ...f, proof_url: e.target.value }))}
          />
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? 'Salvo!' : 'Salvar prestação de contas'}
      </button>
    </div>
  );
}

const PHASE_META = {
  scheduled: { label: 'Agendado', icon: Hourglass, cls: 'bg-blue-100 text-blue-700' },
  live:      { label: 'AO VIVO',  icon: Radio,     cls: 'bg-green-100 text-green-700 animate-pulse' },
  ended:     { label: 'Encerrado', icon: Flag,     cls: 'bg-gray-200 text-gray-700' },
};

export default function InksaSocialPage() {
  const [form, setForm] = useState({ date: '', start: '', end: '', showInApps: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const pollRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [registering, setRegistering] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getSystemSettings();
      const s = res?.data || {};
      setForm({
        date: s.social_day_date || '',
        start: s.social_day_start || '',
        end: s.social_day_end || '',
        showInApps: (s.social_day_show_in_apps || '').toLowerCase() === 'true',
      });
    } catch (e) {
      setError(e.message || 'Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await authService.getSocialDayStatus();
      setStatus(res || null);
    } catch {
      // status é informativo; não bloqueia a página
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await authService.getSocialDayHistory();
      setEvents(res?.events || []);
    } catch {
      // histórico é secundário; não bloqueia a página
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadStatus();
    loadHistory();
  }, [loadSettings, loadStatus, loadHistory]);

  // Grava os números do painel ao vivo como um evento do histórico público
  const registerCurrentEvent = async () => {
    if (!status?.configured) return;
    if (events.some((e) => e.date === status.date)) {
      if (!window.confirm('Já existe um evento com essa data no histórico. Registrar mesmo assim?')) return;
    }
    setRegistering(true);
    try {
      const res = await authService.createSocialEvent({
        date: status.date,
        start_time: status.start_time,
        end_time: status.end_time,
        raised: status.raised,
        orders_count: status.orders_count,
      });
      if (res?.data) setEvents((prev) => [res.data, ...prev]);
    } catch (e) {
      setError(e.message || 'Erro ao registrar evento.');
    } finally {
      setRegistering(false);
    }
  };

  // Painel ao vivo: atualiza sozinho a cada 30s enquanto a página está aberta
  useEffect(() => {
    pollRef.current = setInterval(loadStatus, 30000);
    return () => clearInterval(pollRef.current);
  }, [loadStatus]);

  const handleSave = async () => {
    if (form.date && form.start && form.end && form.end < form.start) {
      setError('A hora final precisa ser depois da hora de início.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await authService.updateSystemSettings({
        social_day_date: form.date,
        social_day_start: form.start,
        social_day_end: form.end,
        social_day_show_in_apps: form.showInApps ? 'true' : 'false',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadStatus();
    } catch (e) {
      setError(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const phase = status?.configured ? PHASE_META[status.phase] : null;
  const PhaseIcon = phase?.icon;
  const dateBr = (d) => (d ? d.split('-').reverse().join('/') : '—');

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg">
          <HeartHandshake className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inksa Social — Dia I</h1>
          <p className="text-sm text-gray-500">
            No Dia I, todo o lucro da plataforma (comissão + margem de frete) é revertido em ações sociais.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-500" /> Configuração do evento
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Dia do evento</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Hora de início
                  </label>
                  <input
                    type="time"
                    className={inputCls}
                    value={form.start}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Hora de término
                  </label>
                  <input
                    type="time"
                    className={inputCls}
                    value={form.end}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  checked={form.showInApps}
                  onChange={(e) => setForm((f) => ({ ...f, showInApps: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-rose-500" /> Mostrar contador nos apps
                  </span>
                  <span className="text-gray-500">
                    Exibe o banner do Dia I com o valor arrecadado ao vivo nos apps Cliente, Restaurante e Entregador.
                  </span>
                </span>
              </label>

              <button
                onClick={handleSave}
                disabled={saving || !form.date}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configuração'}
              </button>
            </>
          )}
        </div>

        {/* Status ao vivo */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Radio className="w-5 h-5 text-rose-500" /> Painel ao vivo
            </h2>
            <button
              onClick={loadStatus}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="Atualizar agora"
            >
              <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!status?.configured ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              Nenhum Dia I configurado ainda. Preencha a data ao lado e salve.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${phase.cls}`}>
                  {PhaseIcon && <PhaseIcon className="w-3.5 h-3.5" />} {phase.label}
                </span>
                <span className="text-xs text-gray-500">
                  {dateBr(status.date)} · {status.start_time} – {status.end_time}
                </span>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white p-5 text-center">
                <p className="text-xs uppercase tracking-wider text-white/85">
                  {status.phase === 'scheduled'
                    ? 'Aguardando início'
                    : status.phase === 'live'
                      ? 'Arrecadado até agora'
                      : 'Total arrecadado'}
                </p>
                <p className="text-4xl font-extrabold mt-1">{money(status.raised)}</p>
                {status.phase !== 'scheduled' && (
                  <p className="text-xs text-white/85 mt-1">{status.orders_count} pedido(s) na janela</p>
                )}
              </div>

              {status.breakdown && status.phase !== 'scheduled' && (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Comissão</p>
                    <p className="font-bold text-gray-800">{money(status.breakdown.commission)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Margem de frete</p>
                    <p className="font-bold text-gray-800">{money(status.breakdown.margin)}</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">
                {status.show_in_apps
                  ? 'Contador visível nos apps Cliente, Restaurante e Entregador.'
                  : 'Contador oculto nos apps (só você vê este painel).'}{' '}
                Atualiza sozinho a cada 30s.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Histórico / prestação de contas */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <History className="w-5 h-5 text-rose-500" /> Prestação de contas (página pública /dia-i)
          </h2>
          <button
            onClick={registerCurrentEvent}
            disabled={registering || !status?.configured || status?.phase === 'scheduled'}
            title={status?.phase === 'scheduled' ? 'Disponível quando o evento começar' : 'Grava os números do painel ao vivo no histórico'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2"
          >
            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Registrar evento atual
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Cada evento registrado aparece em <span className="font-mono">inksadelivery.com.br/dia-i</span> com o valor
          arrecadado e o destino da doação. Preencha o destino (e um link de comprovante, se tiver) e salve.
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum Dia I registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                onSaved={(updated) => setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))}
                onDeleted={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
              />
            ))}
          </div>
        )}
        <a
          href="https://inksadelivery.com.br/dia-i"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline"
        >
          Ver página pública <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Como funciona */}
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-900 space-y-1">
        <p className="font-semibold">Como o valor é calculado</p>
        <p>
          Soma da <strong>comissão da plataforma</strong> + <strong>margem de frete</strong> dos pedidos
          <strong> concluídos</strong> feitos dentro da janela do evento (horário de Brasília) — a mesma fórmula
          da receita nos Relatórios. Como o pedido só conta quando é entregue, o contador cresce ao longo do dia
          com um pequeno atraso em relação aos pedidos que acabaram de ser feitos.
        </p>
      </div>
    </div>
  );
}
