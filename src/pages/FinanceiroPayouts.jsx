// src/pages/FinanceiroPayouts.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listPayouts,
  processPayouts,
  markPayoutPaid,
  cancelPayout,
  getPayout,
} from "../services/payouts";

export default function FinanceiroPayouts() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [partnerType, setPartnerType] = useState(""); // "", "restaurant", "delivery"
  const [status, setStatus] = useState(""); // "", "pending", "paid", "cancelled"
  const [page, setPage] = useState(0);
  const limit = 20;

  const params = useMemo(
    () => ({
      partner_type: partnerType,
      status,
      limit,
      offset: page * limit,
    }),
    [partnerType, status, page]
  );

  async function fetchPage() {
    try {
      setLoading(true);
      const res = await listPayouts(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      alert(`Falha ao carregar payouts: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerType, status, page]);

  const páginas = Math.max(1, Math.ceil(total / limit));

  async function onProcessClick() {
    const partner_type = prompt('Digite o tipo de parceiro para gerar ("restaurant" ou "delivery")', "delivery");
    if (!partner_type) return;
    const cycle_type = prompt('Ciclo ("weekly", "bi-weekly" ou "monthly")', "weekly") || "weekly";
    try {
      setLoading(true);
      const res = await processPayouts({ partner_type, cycle_type });
      alert(`Processados: ${res.generated_count} payouts.`);
      setPage(0);
      await fetchPage();
    } catch (e) {
      console.error(e);
      alert(`Erro ao processar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function onMarkPaid(id) {
    const method = prompt('Método (ex: "pix", "transfer")', "pix");
    const ref = prompt("Ref. externa (opcional)", "");
    try {
      setLoading(true);
      await markPayoutPaid(id, { payment_method: method, payment_ref: ref });
      await fetchPage();
    } catch (e) {
      console.error(e);
      alert(`Erro ao marcar pago: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function onCancel(id) {
    if (!confirm("Confirmar cancelamento deste payout?")) return;
    try {
      setLoading(true);
      await cancelPayout(id);
      await fetchPage();
    } catch (e) {
      console.error(e);
      alert(`Erro ao cancelar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function onView(id) {
    try {
      const res = await getPayout(id);
      console.log(res);
      alert(`Payout ${id}\nStatus: ${res?.payout?.status}\nNet: ${res?.payout?.total_net}`);
    } catch (e) {
      console.error(e);
      alert(`Erro ao carregar detalhes: ${e.message}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-3 py-2"
            value={partnerType}
            onChange={(e) => { setPage(0); setPartnerType(e.target.value); }}
          >
            <option value="">Todos</option>
            <option value="restaurant">Restaurantes</option>
            <option value="delivery">Entregadores</option>
          </select>

          <select
            className="border rounded px-3 py-2"
            value={status}
            onChange={(e) => { setPage(0); setStatus(e.target.value); }}
          >
            <option value="">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagos</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
            onClick={onProcessClick}
            disabled={loading}
          >
            Nova solicitação
          </button>
        </div>
      </div>

      <div className="border rounded overflow-hidden bg-white">
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
              <tr><td className="px-3 py-3" colSpan={11}>Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-3" colSpan={11}>Nenhum registro.</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.id}</td>
                  <td className="px-3 py-2">{p.partner_type}</td>
                  <td className="px-3 py-2">{p.partner_id}</td>
                  <td className="px-3 py-2">{Number(p.total_gross || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2">{Number(p.commission_fee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2 font-semibold">{Number(p.total_net || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{p.payment_method || "-"}</td>
                  <td className="px-3 py-2">{p.payment_ref || "-"}</td>
                  <td className="px-3 py-2">{p.updated_at ? new Date(p.updated_at).toLocaleString() : "-"}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button className="text-indigo-600 hover:underline" onClick={() => onView(p.id)}>Ver</button>
                    {p.status === "pending" && (
                      <>
                        <button className="text-green-600 hover:underline" onClick={() => onMarkPaid(p.id)}>Marcar pago</button>
                        <button className="text-red-600 hover:underline" onClick={() => onCancel(p.id)}>Cancelar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div>Total: {total}</div>
        <div className="space-x-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            Anterior
          </button>
        </div>
        <div>Página {page + 1} / {páginas}</div>
        <div className="space-x-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(páginas - 1, p + 1))}
            disabled={page >= páginas - 1 || loading}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
