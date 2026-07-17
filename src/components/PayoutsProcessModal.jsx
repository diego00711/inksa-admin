import { useState } from "react";

export default function PayoutsProcessModal({ open, onClose, onConfirm, loading }) {
  // "" (Todos) = os dois tipos; "all" (Todos) = todos os ciclos. Padrão
  // Todos/Todos: o motor paga cada parceiro na frequência que ELE escolheu no
  // app, então o admin não precisa adivinhar ciclo nenhum — um clique gera
  // tudo que está pendente. Os selects só servem pra restringir se quiser.
  const [partnerType, setPartnerType] = useState("");
  const [cycleType, setCycleType] = useState("all");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold">Processar Payouts</h3>
        <p className="mt-1 text-xs text-gray-500">
          Gera os repasses pendentes. Cada parceiro é pago na frequência que
          ele escolheu — deixe em <strong>Todos</strong> para gerar tudo de
          uma vez.
        </p>

        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            Tipo de parceiro
            <select
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
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
              <option value="all">Todos</option>
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
