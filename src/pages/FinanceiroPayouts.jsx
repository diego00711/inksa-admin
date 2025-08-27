import { useCallback, useState } from "react";
import PayoutsProcessModal from "../components/PayoutsProcessModal";
import PayoutsTable from "../components/PayoutsTable";
import { processPayouts } from "../services/payouts";

export default function FinanceiroPayouts() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [error, setError] = useState(null);

  const handleProcess = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await processPayouts(payload);
      const list =
        Array.isArray(res?.payouts_generated) ? res.payouts_generated :
        Array.isArray(res) ? res :
        [];
      if (!list.length && res?.error) {
        setError(res.error);
      } else {
        setPayouts((prev) => [...list, ...prev]);
      }
      setModalOpen(false);
    } catch (e) {
      setError(e?.message || "Erro ao processar payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Financeiro — Payouts</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Processar Payouts
        </button>
      </header>

      {error && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PayoutsTable payouts={payouts} />

      <PayoutsProcessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleProcess}
        loading={loading}
      />
    </div>
  );
}
