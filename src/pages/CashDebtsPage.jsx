import { useCallback, useContext, useEffect, useState } from "react";
import { listCashDebts, settleCashDebt } from "../services/payouts";
import { NotificationContext } from "../context/NotificationContext";
import { Loader2, Banknote, HandCoins } from "lucide-react";

const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Modal de acerto: registra quanto o entregador pagou/depositou.
function SettleModal({ open, driver, onClose, onConfirm, loading }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && driver) {
      setAmount(String(Number(driver.cash_debt || 0).toFixed(2)));
      setNote("");
    }
  }, [open, driver]);

  if (!open || !driver) return null;
  const name = driver.name || driver.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold mb-1">Registrar acerto</h3>
        <p className="text-sm text-gray-500 mb-4">
          Registre quanto <strong>{name}</strong> pagou/depositou. Isso reduz a dívida em dinheiro dele.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">Dívida atual</span>
          <span className="text-lg font-bold text-red-600">{brl(driver.cash_debt)}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor recebido (R$)</label>
            <input
              type="number" step="0.01" min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Pré-preenchido com a dívida total. Ajuste se for pagamento parcial.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: depósito PIX, dinheiro na loja…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ amount: parseFloat(amount), note })}
            disabled={loading || !(parseFloat(amount) > 0)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Confirmar acerto"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CashDebtsPage() {
  const { notify } = useContext(NotificationContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCashDebts();
      setItems(res.items || []);
    } catch (e) {
      notify(`Falha ao carregar dívidas: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  const total = items.reduce((s, d) => s + Number(d.cash_debt || 0), 0);

  async function onConfirm({ amount, note }) {
    if (!target) return;
    setSaving(true);
    try {
      const res = await settleCashDebt(target.id, { amount, note });
      const d = res?.data || {};
      notify(`Acerto registrado: ${brl(d.applied)} — dívida agora ${brl(d.debt_after)}`, "success");
      setTarget(null);
      await fetchDebts();
    } catch (e) {
      notify(`Erro no acerto: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6" /> Dívidas em dinheiro
        </h1>
        <div className="text-sm text-gray-600">
          Total em aberto: <span className="font-bold text-red-600">{brl(total)}</span>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Entregadores que recolheram pedidos em dinheiro e devem à plataforma. O abatimento automático já desconta
        do repasse online de quem faz pedidos online; aqui você registra o acerto manual (depósito) de quem só faz dinheiro.
      </p>

      <div className="border rounded overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Entregador</th>
              <th className="px-3 py-2 text-left">Chave PIX</th>
              <th className="px-3 py-2 text-left">Dívida</th>
              <th className="px-3 py-2 text-left">Recebido total</th>
              <th className="px-3 py-2 text-left">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline" /> Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Nenhuma dívida em aberto. 🎉</td></tr>
            ) : items.map((d) => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">{d.name || "—"}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{d.id}</div>
                </td>
                <td className="px-3 py-2">
                  <code className="text-xs break-all">{d.pix_key || "—"}</code>
                </td>
                <td className="px-3 py-2 font-semibold text-red-600">{brl(d.cash_debt)}</td>
                <td className="px-3 py-2">{brl(d.total_cash_received)}</td>
                <td className="px-3 py-2">
                  <button
                    className="inline-flex items-center gap-1 text-green-700 hover:underline text-xs min-h-[36px]"
                    onClick={() => setTarget(d)}
                  >
                    <HandCoins className="h-3.5 w-3.5" /> Registrar acerto
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SettleModal
        open={!!target}
        driver={target}
        onClose={() => setTarget(null)}
        onConfirm={onConfirm}
        loading={saving}
      />
    </div>
  );
}
