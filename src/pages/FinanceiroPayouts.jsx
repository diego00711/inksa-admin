// src/pages/FinanceiroPayouts.jsx
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  listPayouts,
  processPayouts,
  markPayoutPaid,
  cancelPayout,
  getPayout,
  getPayoutProvider,
  autoPayPayout,
} from "../services/payouts";
import { NotificationContext } from "../context/NotificationContext";
import { Loader2, Copy, Zap } from "lucide-react";
import PayoutsProcessModal from "../components/PayoutsProcessModal";

const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Copia texto pra área de transferência (com fallback pra navegadores antigos)
async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch { /* cai no fallback abaixo */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = String(text);
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

// Modal assistido: mostra pra quem pagar, quanto e a chave PIX (com copiar),
// e coleta o comprovante. O admin paga no banco/MP e confirma aqui.
function MarkPaidModal({ open, payout, onClose, onConfirm, onCopy, loading }) {
  const [method, setMethod] = useState("pix");
  const [ref, setRef] = useState("");

  useEffect(() => {
    if (open) { setMethod("pix"); setRef(""); }
  }, [open, payout]);

  if (!open || !payout) return null;

  const pix = payout.pix_key;
  const name = payout.partner_name || payout.partner_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1">Repasse assistido</h3>
        <p className="text-sm text-gray-500 mb-4">Pague no seu banco/Mercado Pago e confirme abaixo.</p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 mb-4">
          <div className="flex justify-between gap-3">
            <span className="text-sm text-gray-500">Parceiro</span>
            <span className="text-sm font-medium text-gray-800 text-right break-words">{name}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-sm text-gray-500">Valor a pagar</span>
            <span className="text-lg font-bold text-green-700">{brl(payout.total_net)}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 block mb-1">Chave PIX</span>
            {pix ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white border border-gray-300 rounded px-2 py-1.5 break-all">{pix}</code>
                <button
                  type="button"
                  onClick={() => onCopy(pix)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-100"
                  title="Copiar chave PIX"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>
            ) : (
              <p className="text-sm text-red-600">Parceiro sem chave PIX cadastrada — pagar por outro meio.</p>
            )}
          </div>
        </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante / referência (opcional)</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="ID da transação PIX, etc."
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

// Modal de pagamento AUTOMÁTICO: dispara o PIX de saída no provedor (Asaas).
// Diferente do assistido — aqui o dinheiro sai de verdade ao confirmar.
function AutoPayModal({ open, payout, onClose, onConfirm, loading }) {
  const [keyType, setKeyType] = useState("");

  // Pré-seleciona o tipo que o parceiro cadastrou (quando houver).
  useEffect(() => {
    if (open) setKeyType(payout?.pix_key_type || "");
  }, [open, payout]);

  if (!open || !payout) return null;

  const pix = payout.pix_key;
  const name = payout.partner_name || payout.partner_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" /> Pagar via PIX (automático)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Ao confirmar, o Inksa envia o PIX direto pela conta do provedor. O dinheiro sai na hora.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3 mb-4">
          <div className="flex justify-between gap-3">
            <span className="text-sm text-gray-500">Parceiro</span>
            <span className="text-sm font-medium text-gray-800 text-right break-words">{name}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-sm text-gray-500">Valor</span>
            <span className="text-lg font-bold text-green-700">{brl(payout.total_net)}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 block mb-1">Chave PIX</span>
            {pix ? (
              <code className="block text-sm bg-white border border-gray-300 rounded px-2 py-1.5 break-all">{pix}</code>
            ) : (
              <p className="text-sm text-red-600">Parceiro sem chave PIX — não é possível pagar automático.</p>
            )}
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo da chave</label>
          <select
            value={keyType}
            onChange={(e) => setKeyType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Detectar automaticamente</option>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="EMAIL">E-mail</option>
            <option value="PHONE">Telefone</option>
            <option value="EVP">Aleatória</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Deixe em "Detectar" na dúvida. Só ajuste se a chave for telefone ou CPF (11 dígitos é ambíguo).
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ pix_key_type: keyType || undefined })}
            disabled={loading || !pix}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Enviar PIX agora"}
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

// Linha rótulo/valor do resumo
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right break-words min-w-0">{value}</span>
    </div>
  );
}

// Modal "Ver": detalhes do repasse + pedidos que o compõem
function PayoutDetailsModal({ open, payout, detail, loading, onClose, onCopy }) {
  if (!open || !payout) return null;
  const head = detail?.payout || {};
  const items = detail?.items || [];
  const name = payout.partner_name || payout.partner_id;
  const tipo = payout.partner_type === "restaurant" ? "Restaurante" : "Entregador";
  const statusLabel =
    payout.status === "paid" ? "Pago" :
    payout.status === "cancelled" ? "Cancelado" : "Pendente";
  const statusCls =
    payout.status === "paid" ? "bg-green-100 text-green-800" :
    payout.status === "cancelled" ? "bg-red-100 text-red-800" :
    "bg-yellow-100 text-yellow-800";
  const fmtDate = (d) => (d ? new Date(d).toLocaleString("pt-BR") : "—");
  const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Detalhes do repasse</h3>
            <p className="text-[11px] text-gray-400 font-mono break-all">{payout.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2" title="Fechar">✕</button>
        </div>

        {/* Resumo */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2.5 mb-4">
          <Row label="Parceiro" value={<span className="font-medium">{name} <span className="text-gray-400">· {tipo}</span></span>} />
          <Row label="Status" value={<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>{statusLabel}</span>} />
          <div className="flex justify-between gap-3">
            <span className="text-sm text-gray-500 shrink-0">Chave PIX</span>
            {payout.pix_key ? (
              <span className="flex items-center gap-1.5 min-w-0">
                <code className="text-xs break-all">{payout.pix_key}</code>
                <button onClick={() => onCopy(payout.pix_key)} className="shrink-0 text-gray-400 hover:text-indigo-600" title="Copiar chave PIX">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span className="text-xs text-red-500">sem PIX</span>
            )}
          </div>
          <Row label="Período" value={`${fmtDay(head.period_start)} — ${fmtDay(head.period_end)}`} />
          <Row label="Método" value={payout.payment_method || head.payment_method || "—"} />
          {(payout.payment_ref || head.payment_ref) && (
            <Row label="Ref. externa" value={<span className="font-mono text-xs break-all">{payout.payment_ref || head.payment_ref}</span>} />
          )}
          <Row label="Criado em" value={fmtDate(head.created_at)} />
          <Row label="Atualizado" value={fmtDate(payout.updated_at || head.updated_at)} />
        </div>

        {/* Valores */}
        <div className="rounded-lg border border-gray-200 p-4 space-y-2 mb-4">
          <Row label="Bruto" value={brl(head.total_gross)} />
          <Row label="Comissão / taxa" value={<span className="text-gray-600">− {brl(head.commission_fee)}</span>} />
          {Number(payout.cash_debt_deducted) > 0 && (
            <Row label="Dívida em dinheiro abatida" value={<span className="text-amber-600">− {brl(payout.cash_debt_deducted)}</span>} />
          )}
          <div className="flex justify-between gap-3 border-t pt-2">
            <span className="text-sm font-semibold text-gray-700">Líquido a pagar</span>
            <span className="text-lg font-bold text-green-700">{brl(payout.total_net ?? head.total_net)}</span>
          </div>
        </div>

        {/* Pedidos que compõem o repasse */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Pedidos neste repasse{!loading && items.length ? ` (${items.length})` : ""}
          </h4>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Nenhum pedido detalhado.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Pedido</th>
                    <th className="px-3 py-2 text-right">Bruto</th>
                    <th className="px-3 py-2 text-right">Taxa</th>
                    <th className="px-3 py-2 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">#{String(it.order_id).slice(0, 8)}</td>
                      <td className="px-3 py-2 text-right">{brl(it.gross_amount)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{brl(it.fee)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{brl(it.net_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            Fechar
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

  const [markPaidTarget, setMarkPaidTarget] = useState(null); // payout object
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  // Provedor de repasse: só mostra o botão de PIX automático se estiver ligado
  const [autoPayReady, setAutoPayReady] = useState(false);
  const [autoPayTarget, setAutoPayTarget] = useState(null); // payout object
  const [autoPayLoading, setAutoPayLoading] = useState(false);

  const handleCopyPix = useCallback(async (pix) => {
    const ok = await copyText(pix);
    notify(ok ? "Chave PIX copiada!" : "Não foi possível copiar.", ok ? "success" : "error");
  }, [notify]);

  const [cancelTarget, setCancelTarget] = useState(null); // payout id
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal "Ver" (detalhes do repasse)
  const [viewTarget, setViewTarget] = useState(null);   // objeto da linha (p)
  const [viewDetail, setViewDetail] = useState(null);   // { payout, items }
  const [viewLoading, setViewLoading] = useState(false);

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

  // Descobre se o pagamento automático está ligado (provedor real configurado).
  // Falha silenciosa: sem isso, só o fluxo manual assistido fica disponível.
  useEffect(() => {
    let alive = true;
    getPayoutProvider()
      .then((res) => { if (alive) setAutoPayReady(!!res?.auto_pay_enabled); })
      .catch(() => { if (alive) setAutoPayReady(false); });
    return () => { alive = false; };
  }, []);

  const páginas = Math.max(1, Math.ceil(total / limit));

  async function onProcessConfirm({ partner_type, cycle_type }) {
    setProcessLoading(true);
    try {
      const res = await processPayouts({ partner_type, cycle_type });
      // O backend retorna total_payouts (não generated_count). 0 significa
      // "nenhum repasse pendente pra esse filtro" — não é erro.
      const n = res.total_payouts ?? 0;
      notify(
        n > 0
          ? `${n} repasse(s) gerado(s).`
          : "Nenhum repasse pendente para gerar.",
        n > 0 ? "success" : "info",
      );
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
      await markPayoutPaid(markPaidTarget.id, { payment_method, payment_ref });
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

  async function onAutoPayConfirm({ pix_key_type }) {
    if (!autoPayTarget) return;
    setAutoPayLoading(true);
    try {
      const res = await autoPayPayout(autoPayTarget.id, { pix_key_type });
      notify(`PIX enviado! Ref: ${res?.provider_txid || "—"}`, "success");
      setAutoPayTarget(null);
      await fetchPage();
    } catch (e) {
      console.error(e);
      notify(`Falha no PIX automático: ${e.message}`, "error");
    } finally {
      setAutoPayLoading(false);
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

  async function onView(p) {
    // abre o modal já com os dados da linha; busca os itens/período por baixo
    setViewTarget(p);
    setViewDetail(null);
    setViewLoading(true);
    try {
      const res = await getPayout(p.id);
      setViewDetail(res);
    } catch (e) {
      console.error(e);
      notify(`Erro ao carregar detalhes: ${e.message}`, "error");
    } finally {
      setViewLoading(false);
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
            <option value="pending_transfer">Pendentes</option>
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
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Parceiro</th>
              <th className="px-3 py-2 text-left">Chave PIX</th>
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
                <td className="px-3 py-6 text-center" colSpan={9}>
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando…
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-6 text-center text-gray-400" colSpan={9}>Nenhum registro encontrado.</td></tr>
            ) : (
              items.map((p) => {
                const isOpen = !["paid", "cancelled"].includes(p.status);
                const statusLabel =
                  p.status === "paid" ? "Pago" :
                  p.status === "cancelled" ? "Cancelado" :
                  "Pendente";
                return (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 capitalize">{p.partner_type === "restaurant" ? "Restaurante" : "Entregador"}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{p.partner_name || "—"}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{p.partner_id}</div>
                  </td>
                  <td className="px-3 py-2">
                    {p.pix_key ? (
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs break-all max-w-[180px]">{p.pix_key}</code>
                        <button
                          className="shrink-0 text-gray-400 hover:text-indigo-600"
                          title="Copiar chave PIX"
                          onClick={() => handleCopyPix(p.pix_key)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500">sem PIX</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {brl(p.total_net)}
                    {Number(p.cash_debt_deducted) > 0 && (
                      <div className="text-[11px] font-normal text-amber-600" title="Dívida em dinheiro abatida deste repasse">
                        − {brl(p.cash_debt_deducted)} abatido (dinheiro)
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.status === 'paid' ? 'bg-green-100 text-green-800' :
                      p.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2">{p.payment_method || "-"}</td>
                  <td className="px-3 py-2">{p.payment_ref || "-"}</td>
                  <td className="px-3 py-2">{p.updated_at ? new Date(p.updated_at).toLocaleString('pt-BR') : "-"}</td>
                  <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                    <button className="text-indigo-600 hover:underline text-xs min-h-[44px] inline-flex items-center" onClick={() => onView(p)}>Ver</button>
                    {isOpen && (
                      <>
                        {autoPayReady && p.pix_key && (
                          <button
                            className="text-amber-600 hover:underline text-xs min-h-[44px] inline-flex items-center gap-1"
                            onClick={() => setAutoPayTarget(p)}
                            title="Enviar PIX automaticamente pelo provedor"
                          >
                            <Zap className="h-3.5 w-3.5" /> PIX auto
                          </button>
                        )}
                        <button className="text-green-600 hover:underline text-xs min-h-[44px] inline-flex items-center" onClick={() => setMarkPaidTarget(p)}>Pagar</button>
                        <button className="text-red-600 hover:underline text-xs min-h-[44px] inline-flex items-center" onClick={() => setCancelTarget(p.id)}>Cancelar</button>
                      </>
                    )}
                  </td>
                </tr>
                );
              })
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
        payout={markPaidTarget}
        onClose={() => setMarkPaidTarget(null)}
        onConfirm={onMarkPaidConfirm}
        onCopy={handleCopyPix}
        loading={markPaidLoading}
      />

      <AutoPayModal
        open={!!autoPayTarget}
        payout={autoPayTarget}
        onClose={() => setAutoPayTarget(null)}
        onConfirm={onAutoPayConfirm}
        loading={autoPayLoading}
      />

      <ConfirmCancelModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={onCancelConfirm}
        loading={cancelLoading}
      />

      <PayoutDetailsModal
        open={!!viewTarget}
        payout={viewTarget}
        detail={viewDetail}
        loading={viewLoading}
        onClose={() => { setViewTarget(null); setViewDetail(null); }}
        onCopy={handleCopyPix}
      />
    </div>
  );
}
