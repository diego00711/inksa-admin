// src/pages/OcorrenciasPage.jsx — Ocorrências de entrega (falhas)
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Phone, CheckCircle2 } from 'lucide-react';
import { listIncidents, resolveIncident, refundIncident } from '../services/incidents';

const FAULT_LABELS = {
  customer: 'Culpa do cliente',
  restaurant: 'Culpa do restaurante',
  courier: 'Culpa do entregador',
  none: '—',
};

const REASON_LABELS = {
  customer_not_found: 'Cliente não localizado',
  wrong_address: 'Endereço errado/incompleto',
  customer_refused: 'Cliente recusou o pedido',
  customer_absent: 'Ninguém para receber',
  courier_issue: 'Problema do entregador',
  wrong_order: 'Pedido errado/incompleto',
  payment_issue: 'Problema no pagamento',
};

const OUTCOME_LABELS = {
  return_to_restaurant: '🔁 Devolver ao restaurante',
  dispose: '🗑️ Descartar',
  keep: 'Entregador ficou',
};

const RESOLUTIONS = [
  { value: 'returned', label: 'Retornado ao restaurante' },
  { value: 'refunded', label: 'Reembolsado ao cliente' },
  { value: 'retry', label: 'Reenviar entrega' },
  { value: 'closed', label: 'Encerrado' },
];

const RESOLUTION_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  returned: 'bg-blue-100 text-blue-800',
  refunded: 'bg-purple-100 text-purple-800',
  retry: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-green-100 text-green-800',
};

function IncidentCard({ inc, onResolved }) {
  const [resolution, setResolution] = useState('returned');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const isPending = inc.resolution === 'pending';
  const refundPending = inc.refund_status === 'pending' && Number(inc.refund_amount) > 0;

  const apply = async () => {
    setSaving(true);
    try {
      await resolveIncident(inc.id, resolution, note.trim());
      onResolved();
    } catch (e) {
      alert(e.message || 'Erro ao resolver ocorrência');
    } finally {
      setSaving(false);
    }
  };

  const doRefund = async () => {
    if (!window.confirm(`Reembolsar R$ ${Number(inc.refund_amount || 0).toFixed(2)} ao cliente? Isso devolve o dinheiro de verdade pelo Mercado Pago e não pode ser desfeito.`)) return;
    setRefunding(true);
    try {
      await refundIncident(inc.id);
      onResolved();
    } catch (e) {
      alert(e.message || 'Erro ao processar reembolso');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-red-100 text-red-700 rounded-lg p-1.5"><AlertTriangle className="w-4 h-4" /></span>
          <div>
            <p className="font-bold text-gray-800 text-sm">{REASON_LABELS[inc.reason] || inc.reason}</p>
            <p className="text-xs text-gray-400">
              Pedido #{(inc.order_id || '').slice(-6).toUpperCase()} · {inc.created_at ? new Date(inc.created_at).toLocaleString('pt-BR') : ''}
            </p>
            {inc.outcome && (
              <p className="text-xs text-gray-500 mt-0.5">Entregador: <b>{OUTCOME_LABELS[inc.outcome] || inc.outcome}</b></p>
            )}
            {inc.fault && inc.fault !== 'none' && (
              <p className="text-xs text-gray-500">Atribuição: <b>{FAULT_LABELS[inc.fault] || inc.fault}</b></p>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${RESOLUTION_BADGE[inc.resolution] || 'bg-gray-100 text-gray-700'}`}>
          {inc.resolution === 'pending' ? 'Pendente' : (RESOLUTIONS.find(r => r.value === inc.resolution)?.label || inc.resolution)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-400">Cliente</p>
          <p className="text-gray-800">{inc.client_name || '—'}</p>
          {inc.client_phone && <a href={`tel:${inc.client_phone}`} className="text-xs text-blue-600 flex items-center gap-1"><Phone className="w-3 h-3" />{inc.client_phone}</a>}
        </div>
        <div>
          <p className="text-xs text-gray-400">Entregador</p>
          <p className="text-gray-800">{inc.courier_name || '—'}</p>
          {inc.courier_phone && <a href={`tel:${inc.courier_phone}`} className="text-xs text-blue-600 flex items-center gap-1"><Phone className="w-3 h-3" />{inc.courier_phone}</a>}
        </div>
        <div>
          <p className="text-xs text-gray-400">Valor do pedido</p>
          <p className="text-gray-800 font-semibold">R$ {Number(inc.total_amount || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Tentou contato?</p>
          <p className="text-gray-800">{inc.contact_attempts?.tried_contact ? 'Sim' : '—'}</p>
        </div>
      </div>

      {inc.notes && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-3 whitespace-pre-line">{inc.notes}</p>
      )}

      {Number(inc.refund_amount) > 0 && (
        <div className={`rounded-lg p-2.5 mb-3 text-sm flex items-center justify-between gap-2 ${inc.refund_status === 'done' ? 'bg-green-50' : 'bg-purple-50'}`}>
          <span className={inc.refund_status === 'done' ? 'text-green-700' : 'text-purple-700'}>
            Reembolso ao cliente: <b>R$ {Number(inc.refund_amount).toFixed(2)}</b>
            {inc.refund_status === 'done' ? ' — processado ✓' : ' — pendente'}
          </span>
          {refundPending && (
            <button onClick={doRefund} disabled={refunding} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
              {refunding && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Processar reembolso
            </button>
          )}
        </div>
      )}

      {isPending ? (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end border-t pt-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Resolução</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm mt-0.5">
              {RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (opcional)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={apply} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolver
          </button>
        </div>
      ) : (
        <p className="text-xs text-green-600 border-t pt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido {inc.resolved_at ? `em ${new Date(inc.resolved_at).toLocaleString('pt-BR')}` : ''}
        </p>
      )}
    </div>
  );
}

export default function OcorrenciasPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlyPending, setOnlyPending] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIncidents(await listIncidents(onlyPending ? { resolution: 'pending' } : {}));
    } catch (e) {
      console.error('Erro ao carregar ocorrências:', e);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [onlyPending]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" /> Ocorrências de Entrega
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setOnlyPending(true)} className={`px-3 py-1.5 text-sm font-medium rounded-md ${onlyPending ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Pendentes</button>
            <button onClick={() => setOnlyPending(false)} className={`px-3 py-1.5 text-sm font-medium rounded-md ${!onlyPending ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Todas</button>
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Atualizar"><RefreshCw className="w-4 h-4 text-gray-600" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
          <p>{onlyPending ? 'Nenhuma ocorrência pendente. Tudo certo! 🎉' : 'Nenhuma ocorrência registrada.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => <IncidentCard key={inc.id} inc={inc} onResolved={load} />)}
        </div>
      )}
    </div>
  );
}
