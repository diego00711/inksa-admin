import { useState } from "react";

export default function PayoutsProcessModal({ open, onClose, onConfirm, loading }) {
  const [partnerType, setPartnerType] = useState("restaurant");
  const [cycleType, setCycleType] = useState("weekly");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Processar Payouts</h3>

        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            Tipo de parceiro
            <select
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="restaurant">Restaurante</option>
              <option value="delivery">Entregador</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            Ciclo
            <select
              value={cycleType}
              onChange={(e) => setCycleType(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="weekly">Semanal</option>
              <option value="bi-weekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
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
            onClick={() => onConfirm({ partner_type: partnerType, cycle_type: cycleType })}
            disabled={loading}
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {loading ? "Processando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
