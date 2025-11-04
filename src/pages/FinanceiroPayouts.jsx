import { useEffect, useMemo, useState } from "react";
import {
  listPayouts,
  createPayout,
  approvePayout,
  rejectPayout,
  payPayout,
  getPayout,
} from "../services/payouts";

const Badge = ({ s }) => {
  const cls =
    {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    }[s] || "bg-gray-100 text-gray-800";
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{s}</span>
  );
};

export default function FinanceiroPayouts() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [courierId, setCourierId] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    courier_id: "",
    amount: "",
    method: "pix",
    notes: "",
  });

  const total = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.amount || 0), 0),
    [items]
  );

  async function fetchData() {
    setLoading(true);
    try {
      const data = await listPayouts({
        status: status || undefined,
        courier_id: courierId || undefined,
      });
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar payouts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [status]);

  async function onCreate(e) {
    e.preventDefault();
    try {
      const payload = {
        courier_id: form.courier_id.trim(),
        amount: Number(form.amount),
        method: form.method,
        notes: form.notes || undefined,
      };
      const { payout } = await createPayout(payload);
      setItems((prev) => [payout, ...prev]);
      setShowCreate(false);
      setForm({ courier_id: "", amount: "", method: "pix", notes: "" });
    } catch (e) {
      console.error(e);
      alert("Erro ao criar payout");
    }
  }

  async function onApprove(id) {
    try {
      const { payout } = await approvePayout(id);
      setItems((prev) => prev.map((x) => (x.id === id ? payout : x)));
    } catch (e) {
      alert("Erro ao aprovar");
    }
  }

  async function onReject(id) {
    const reason = prompt("Motivo da rejeição (opcional):") || "";
    try {
      const { payout } = await rejectPayout(id, reason);
      setItems((prev) => prev.map((x) => (x.id === id ? payout : x)));
    } catch (e) {
      alert("Erro ao rejeitar");
    }
  }

  async function onPay(id) {
    const ref = prompt("Ref. externa (opcional, ex.: txid Pix ou id do MP):") || undefined;
    try {
      const { payout } = await payPayout(id, ref);
      setItems((prev) => prev.map((x) => (x.id === id ? payout : x)));
    } catch (e) {
      alert("Erro ao marcar como pago");
    }
  }

  async function onInspect(id) {
    try {
      const { payout } = await getPayout(id);
      alert(
        `Payout ${payout.id}\n\nCourier: ${payout.courier_id}\nValor: R$ ${Number(
          payout.amount
        ).toFixed(2)}\nStatus: ${payout.status}\nMétodo: ${
          payout.method
        }\nRef: ${payout.external_ref || "-"}\nCriado: ${
          payout.created_at
        }\nAtualizado: ${payout.updated_at}`
      );
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="paid">Pagos</option>
            <option value="rejected">Rejeitados</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
          >
            Nova solicitação
          </button>
        </div>
      </header>

      <section className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <input
              placeholder="Filtrar por Courier ID"
              className="border rounded px-2 py-1"
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
            />
            <button onClick={fetchData} className="border px-3 py-1 rounded">
              Filtrar
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Total listado: R$ {total.toFixed(2)}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Courier</th>
                <th className="text-right px-3 py-2">Valor</th>
                <th className="text-left px-3 py-2">Método</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Ref. Externa</th>
                <th className="text-left px-3 py-2">Atualizado</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4">
                    Carregando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4">
                    Sem registros.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="px-3 py-2">{it.id}</td>
                    <td className="px-3 py-2">{it.courier_id}</td>
                    <td className="px-3 py-2 text-right">
                      R$ {Number(it.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">{it.method}</td>
                    <td className="px-3 py-2">
                      <Badge s={it.status} />
                    </td>
                    <td className="px-3 py-2">{it.external_ref || "-"}</td>
                    <td className="px-3 py-2">
                      {new Date(it.updated_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-3">
                        <button
                          onClick={() => onInspect(it.id)}
                          className="text-gray-700 hover:underline"
                        >
                          Ver
                        </button>
                        {it.status === "pending" && (
                          <>
                            <button
                              onClick={() => onApprove(it.id)}
                              className="text-blue-600 hover:underline"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => onReject(it.id)}
                              className="text-red-600 hover:underline"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {(it.status === "approved" || it.status === "pending") && (
                          <button
                            onClick={() => onPay(it.id)}
                            className="text-green-700 hover:underline"
                          >
                            Marcar Pago
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <form
            onSubmit={onCreate}
            className="bg-white rounded-xl p-6 shadow w-full max-w-md space-y-3"
          >
            <h2 className="text-lg font-semibold">Nova Solicitação</h2>
            <input
              placeholder="Courier ID (UUID)"
              className="border rounded px-3 py-2 w-full"
              value={form.courier_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, courier_id: e.target.value }))
              }
              required
            />
            <input
              placeholder="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              className="border rounded px-3 py-2 w-full"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              required
            />
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.method}
              onChange={(e) =>
                setForm((f) => ({ ...f, method: e.target.value }))
              }
            >
              <option value="pix">PIX</option>
              <option value="manual">Manual</option>
            </select>
            <textarea
              placeholder="Observações"
              className="border rounded px-3 py-2 w-full"
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 border rounded"
              >
                Cancelar
              </button>
              <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
