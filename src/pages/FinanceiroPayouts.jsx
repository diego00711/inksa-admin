// src/pages/FinanceiroPayouts.jsx
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  listPayouts,
  processPayouts,
  markPayoutPaid,
  cancelPayout,
  getPayout,
} from "../services/payouts";
import { NotificationContext } from "../context/NotificationContext";
import { Loader2 } from "lucide-react";
import PayoutsProcessModal from "../components/PayoutsProcessModal";

// Inline modal for marking a payout as paid
function MarkPaidModal({ open, onClose, onConfirm, loading }) {
  const [method, setMethod] = useState("pix");
  const [ref, setRef] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Marcar como pago</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pagamento</label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder='Ex: "pix", "transfer"'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referência externa (opcional)</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="ID de transação, etc."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ payment_method: method, payment_ref: ref })}
            disabled={loading || !method.trim()}
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline modal to confirm cancellation
function ConfirmCancelModal({ open, onClose, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xs rounded-lg bg-white p-5 shadow-xl mx-4">
        <h3 className="text-lg font-semibold mb-2">Cancelar payout</h3>
        <p className="text-sm text-gray-600 mb-5">Tem certeza que deseja cancelar este payout? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Não
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Sim, cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceiroPayouts() {
  const { notify } = useContext(NotificationContext);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [partnerType, setPartnerType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Modal states
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);

  const [markPaidTarget, setMarkPaidTarget] = useState(null); // payout id
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null); // payout id
  const [cancelLoading, setCancelLoading] = useState(false);

  const params = useMemo(
    () => ({
      partner_type: partnerType,
      status,
      limit,
      offset: page * limit,
    }),
    [partnerType, status, page]
  );

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listPayouts(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      notify(`Falha ao carregar payouts: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [params, notify]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const páginas = Math.max(1, Math.ceil(total / limit));

  async function onProcessConfirm({ partner_type, cycle_type }) {
    setProcessLoading(true);
    try {
      const res = await processPayouts({ partner_type, cycle_type });
      notify(`Processados: ${res.generated_count ?? 0} payouts.`, "success");
      setProcessModalOpen(false);
      setPage(0);
      await fetchPage();
    } catch (e) {
      console.error(e);
      notify(`Erro ao processar: ${e.message}`, "error");
    } finally {
      setProcessLoading(false);
    }
  }

  async function onMarkPaidConfirm({ payment_method, payment_ref }) {
    if (!markPaidTarget) return;
    setMarkPaidLoading(true);
    try {
      await markPayoutPaid(markPaidTarget, { payment_method, payment_ref });
      notify("Payout marcado como pago!", "success");
      setMarkPaidTarget(null);
      await fetchPage();
    } catch (e) {
      console.error(e);
      notify(`Erro ao marcar pago: ${e.message}`, "error");
    } finally {
      setMarkPaidLoading(false);
    }
  }

  async function onCancelConfirm() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await cancelPayout(cancelTarget);
      notify("Payout cancelado.", "success");
      setCancelTarget(null);
      await fetchPage();
    } catch (e) {
      console.error(e);
      notify(`Erro ao cancelar: ${e.message}`, "error");
    } finally {
      setCancelLoading(false);
    }
  }

  async function onView(id) {
    try {
      const res = await getPayout(id);
      // Show details in a notification — replacing alert()
      notify(`Payout ${id} | Status: ${res?.payout?.status ?? "—"} | Líquido: ${res?.payout?.total_net ?? "—"}`, "info", 6000);
    } catch (e) {
      console.error(e);
      notify(`Erro ao carregar detalhes: ${e.message}`, "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Payouts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border rounded px-3 py-2 text-base min-h-[44px]"
            value={partnerType}
            onChange={(e) => { setPage(0); setPartnerType(e.target.value); }}
          >
            <option value="">Todos</option>
            <option value="restaurant">Restaurantes</option>
            <option value="delivery">Entregadores</option>
          </select>

          <select
            className="border rounded px-3 py-2 text-base min-h-[44px]"
            value={status}
            onChange={(e) => { setPage(0); setStatus(e.target.value); }}
          >
            <option value="">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagos</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded min-h-[44px]"
            onClick={() => setProcessModalOpen(true)}
            disabled={loading}
          >
            Nova solicitação
          </button>
        </div>
      </div>

      <div className="border rounded overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Parceiro</th>
              <th className="px-3 py-2 text-left">Bruto</th>
              <th className="px-3 py-2 text-left">Taxa</th>
              <th className="px-3 py-2 text-left">Líquido</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Método</th>
              <th className="px-3 py-2 text-left">Ref. Externa</th>
              <th className="px-3 py-2 text-left">Atualizado</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center" colSpan={11}>
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando…
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-6 text-center text-gray-400" colSpan={11}>Nenhum registro encontrado.</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{p.id}</td>
                  <td className="px-3 py-2 capitalize">{p.partner_type}</td>
                  <td className="px-3 py-2">{p.partner_id}</td>
                  <td className="px-3 py-2">{Number(p.total_gross || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2">{Number(p.commission_fee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2 font-semibold">{Number(p.total_net || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.status === 'paid' ? 'bg-green-100 text-green-800' :
                      p.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{p.payment_method || "-"}</td>
                  <td className="px-3 py-2">{p.payment_ref || "-"}</td>
                  <td className="px-3 py-2">{p.updated_at ? new Date(p.updated_at).toLocaleString('pt-BR') : "-"}</td>
                  <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                    <button className="text-indigo-600 hover:underline text-xs min-h-[44px] inline-flex items-center" onClick={() => onView(p.id)}>Ver</button>
                    {p.status === "pending" && (
                      <>
                        <button className="text-green-600 hover:underline text-xs min-h-[44px] inline-flex items-center" onClick={() => setMarkPaidTarget(p.id)}>Marcar pago</button>
                        <button className="text-red-600 hover:underline text-xs min-h-[44px] inline-flex items-center" onClick={() => setCancelTarget(p.id)}>Cancelar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            Anterior
          </button>
          <span>Página {page + 1} / {páginas}</span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(páginas - 1, p + 1))}
            disabled={page >= páginas - 1 || loading}
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Modals */}
      <PayoutsProcessModal
        open={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        onConfirm={onProcessConfirm}
        loading={processLoading}
      />

      <MarkPaidModal
        open={!!markPaidTarget}
        onClose={() => setMarkPaidTarget(null)}
        onConfirm={onMarkPaidConfirm}
        loading={markPaidLoading}
      />

      <ConfirmCancelModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={onCancelConfirm}
        loading={cancelLoading}
      />
    </div>
  );
}
