// src/pages/OcorrenciasPage.jsx — Ocorrências de entrega (falhas)
import { useState, useEffect, useCallback, useContext } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Phone, CheckCircle2 } from 'lucide-react';
import { listIncidents, resolveIncident, refundIncident, chargeIncidentCourier, confirmIncidentReturn } from '../services/incidents';
import { NotificationContext } from '../context/NotificationContext';
import { useConfirm } from '../components/ConfirmProvider.jsx';

const FAULT_LABELS = {
  customer: 'Culpa do cliente',
  restaurant: 'Culpa do parceiro',
  courier: 'Culpa do entregador',
  none: '—',
};

const REASON_LABELS = {
  customer_not_found: 'Cliente não localizado',
  wrong_address: 'Endereço errado/incompleto',
  customer_refused: 'Cliente recusou o pedido',
  customer_absent: 'Ninguém para receber',
  courier_issue: 'Problema do entregador',
  courier_damaged: 'Entregador derrubou/danificou',
  wrong_order: 'Pedido errado/incompleto',
  payment_issue: 'Problema no pagamento',
};

const OUTCOME_LABELS = {
  return_to_restaurant: '🔁 Devolver ao parceiro',
  dispose: '🗑️ Descartar',
  awaiting_restaurant: '⏳ Aguardando o parceiro decidir',
  keep: 'Entregador ficou',
};

const RESOLUTIONS = [
  { value: 'returned', label: 'Retornado ao parceiro' },
  { value: 'discarded', label: 'Descartado' },
  { value: 'refunded', label: 'Reembolsado ao cliente' },
  { value: 'retry', label: 'Reenviar entrega' },
  { value: 'closed', label: 'Encerrado' },
];

const RESOLUTION_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  returned: 'bg-blue-100 text-blue-800',
  discarded: 'bg-gray-200 text-gray-700',
  refunded: 'bg-purple-100 text-purple-800',
  retry: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-green-100 text-green-800',
};

// Planilha de referência: espelha EXATAMENTE a DELIVERY_INCIDENT_POLICY do
// backend (orders.py). Serve pro admin saber, de bate-pronto, quem tem culpa e
// quem recebe/é reembolsado em cada motivo. Se a policy mudar no backend, mude
// aqui também. refund/rest/ent: true = recebe/reembolsa; false = não.
const POLICY_TABLE = [
  { reason: 'customer_not_found', fault: 'customer',   refund: false, rest: true,  courier: true  },
  { reason: 'customer_absent',    fault: 'customer',   refund: false, rest: true,  courier: true  },
  { reason: 'wrong_address',      fault: 'customer',   refund: false, rest: true,  courier: true  },
  { reason: 'customer_refused',   fault: 'customer',   refund: false, rest: true,  courier: true  },
  { reason: 'wrong_order',        fault: 'restaurant', refund: true,  rest: false, courier: true  },
  { reason: 'courier_issue',      fault: 'courier',    refund: true,  rest: true,  courier: false },
  { reason: 'courier_damaged',    fault: 'courier',    refund: true,  rest: true,  courier: false },
  { reason: 'payment_issue',      fault: 'none',       refund: false, rest: false, courier: false },
];

const FAULT_CHIP = {
  customer: 'bg-blue-100 text-blue-700',
  restaurant: 'bg-orange-100 text-orange-700',
  courier: 'bg-red-100 text-red-700',
  none: 'bg-gray-100 text-gray-500',
};

// ✓ verde = recebe/reembolsa; ✗ vermelho = não
const YesNo = ({ v }) => (
  <span className={v ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{v ? '✓' : '✗'}</span>
);

function PolicyReferenceTable() {
  return (
    <details className="mb-5 rounded-xl border border-gray-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
        📋 Planilha de responsabilidades e descontos
        <span className="text-xs font-normal text-gray-400">(quem tem culpa, quem recebe, quem é reembolsado)</span>
      </summary>
      <div className="px-4 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3 font-semibold">Motivo</th>
                <th className="py-2 px-3 font-semibold">Culpa</th>
                <th className="py-2 px-3 font-semibold text-center">Cliente reembolsado</th>
                <th className="py-2 px-3 font-semibold text-center">Parceiro recebe</th>
                <th className="py-2 pl-3 font-semibold text-center">Entregador recebe</th>
              </tr>
            </thead>
            <tbody>
              {POLICY_TABLE.map((row) => (
                <tr key={row.reason} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-gray-800">{REASON_LABELS[row.reason] || row.reason}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FAULT_CHIP[row.fault]}`}>
                      {FAULT_LABELS[row.fault]}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center"><YesNo v={row.refund} /></td>
                  <td className="py-2 px-3 text-center"><YesNo v={row.rest} /></td>
                  <td className="py-2 pl-3 text-center"><YesNo v={row.courier} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          <p>• <b>Reembolso ao cliente é automático</b> em pedido online quando a culpa não é dele. Em dinheiro nada foi cobrado, então não há estorno.</p>
          <p>• <b>Descontar o entregador</b> pelo prejuízo (culpa dele) é decisão sua, caso a caso — use o botão <b>“Descontar do entregador”</b> no card da ocorrência. Não é automático.</p>
          <p>• O <b>bot</b> decide o destino do pedido: danificado ou parceiro fechado → <b>descartar</b>; senão pergunta ao parceiro se quer a <b>devolução</b> (confirmada com código).</p>
          <p>• Na <b>devolução confirmada</b> sem culpa do entregador, ele ganha a <b>taxa de retorno</b> (frete cheio) pelo deslocamento de volta.</p>
        </div>
      </div>
    </details>
  );
}

function IncidentCard({ inc, onResolved }) {
  const { notify } = useContext(NotificationContext);
  const confirm = useConfirm();
  const [resolution, setResolution] = useState('returned');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [charging, setCharging] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const isPending = inc.resolution === 'pending';
  const refundPending = inc.refund_status === 'pending' && Number(inc.refund_amount) > 0;
  const alreadyCharged = Number(inc.courier_charge) > 0;
  const returnPending = inc.outcome === 'return_to_restaurant' && !inc.return_confirmed_at;

  const doCharge = async () => {
    const amt = Number(String(chargeAmount).replace(',', '.'));
    if (!(amt > 0)) { notify('Informe um valor maior que zero', 'error'); return; }
    if (!(await confirm({
      title: 'Descontar do entregador',
      message: `Lançar R$ ${amt.toFixed(2)} como dívida do entregador ${inc.courier_name || ''}? Será abatido do próximo repasse.`,
      confirmText: 'Descontar', danger: true,
    }))) return;
    setCharging(true);
    try {
      await chargeIncidentCourier(inc.id, amt);
      notify('Desconto lançado na dívida do entregador', 'success');
      onResolved();
    } catch (e) {
      notify(e.message || 'Erro ao descontar do entregador', 'error');
    } finally { setCharging(false); }
  };

  const doConfirmReturn = async () => {
    if (!(await confirm({
      title: 'Confirmar devolução',
      message: 'Confirmar que o pedido voltou ao parceiro? (use quando o parceiro não confirmou pelo app). Se não for culpa do entregador, a taxa de retorno é creditada a ele.',
      confirmText: 'Confirmar devolução',
    }))) return;
    setConfirmingReturn(true);
    try {
      await confirmIncidentReturn(inc.order_id);
      notify('Devolução confirmada', 'success');
      onResolved();
    } catch (e) {
      notify(e.message || 'Erro ao confirmar devolução', 'error');
    } finally { setConfirmingReturn(false); }
  };

  const apply = async () => {
    setSaving(true);
    try {
      await resolveIncident(inc.id, resolution, note.trim());
      notify('Ocorrência resolvida com sucesso', 'success');
      onResolved();
    } catch (e) {
      notify(e.message || 'Erro ao resolver ocorrência', 'error');
    } finally {
      setSaving(false);
    }
  };

  const doRefund = async () => {
    // Confirmação explícita: reembolso é destrutivo (move dinheiro de verdade).
    if (!(await confirm({
      title: 'Processar reembolso',
      message: `Reembolsar R$ ${Number(inc.refund_amount || 0).toFixed(2)} ao cliente? Isso devolve o dinheiro de verdade e não pode ser desfeito.`,
      confirmText: 'Reembolsar',
      danger: true,
    }))) return;
    setRefunding(true);
    try {
      await refundIncident(inc.id);
      notify('Reembolso processado com sucesso', 'success');
      onResolved();
    } catch (e) {
      notify(e.message || 'Erro ao processar reembolso', 'error');
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

      {inc.photo_url && (
        <a href={inc.photo_url} target="_blank" rel="noreferrer" className="block mb-3" title="Abrir foto-comprovante">
          <img src={inc.photo_url} alt="Foto-comprovante" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
        </a>
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

      {/* Devolução: código + status. Admin pode confirmar como fallback. */}
      {(inc.outcome === 'return_to_restaurant' || inc.outcome === 'awaiting_restaurant') && (
        <div className="rounded-lg p-2.5 mb-3 text-sm bg-blue-50 flex items-center justify-between gap-2">
          <span className="text-blue-800">
            {inc.outcome === 'awaiting_restaurant'
              ? 'Aguardando o parceiro decidir a devolução'
              : inc.return_confirmed_at
                ? <>Devolução confirmada ✓ {inc.return_code ? <>(cód. <b>{inc.return_code}</b>)</> : null}</>
                : <>Devolução pendente {inc.return_code ? <>— código <b>{inc.return_code}</b></> : null}</>}
          </span>
          {returnPending && (
            <button onClick={doConfirmReturn} disabled={confirmingReturn} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
              {confirmingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmar devolução
            </button>
          )}
        </div>
      )}

      {/* Descontar do entregador (vira dívida). Só quando há entregador e ainda
          não foi descontado. */}
      {inc.delivery_id && (
        alreadyCharged ? (
          <div className="rounded-lg p-2.5 mb-3 text-sm bg-orange-50 text-orange-800">
            Descontado do entregador: <b>R$ {Number(inc.courier_charge).toFixed(2)}</b> (lançado na dívida)
          </div>
        ) : (
          <div className="rounded-lg p-2.5 mb-3 bg-gray-50 border border-gray-200 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Descontar do entregador (R$)</label>
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="ex.: 20.00"
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm mt-0.5"
              />
            </div>
            <button onClick={doCharge} disabled={charging} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1 whitespace-nowrap">
              {charging && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Descontar
            </button>
          </div>
        )
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

      <PolicyReferenceTable />

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
