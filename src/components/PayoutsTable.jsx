function formatBRL(value) {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

export default function PayoutsTable({ payouts }) {
  const rows = Array.isArray(payouts) ? payouts : [];

  if (!rows.length) {
    return (
      <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-600">
        Nenhum payout para exibir.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th>ID</Th>
            <Th>Parceiro</Th>
            <Th>Tipo</Th>
            <Th>Ciclo</Th>
            <Th>Período</Th>
            <Th>Total</Th>
            <Th>Pedidos</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={String(p.payout_id)} className="border-t">
              <Td>{p.payout_id}</Td>
              <Td>{p.partner_id}</Td>
              <Td className="capitalize">{p.partner_type}</Td>
              <Td>{p.cycle_type}</Td>
              <Td>
                {p.period_start ? new Date(p.period_start).toLocaleString() : "-"} — {" "}
                {p.period_end ? new Date(p.period_end).toLocaleString() : "-"}
              </Td>
              <Td>{formatBRL(p.total_amount)}</Td>
              <Td>
                {p.order_count} {" "}
                <span className="text-gray-500">
                  {Array.isArray(p.order_ids)
                    ? `(${p.order_ids.slice(0, 3).join(", ")}${
                        p.order_ids.length > 3 ? "..." : ""
                      })`
                    : ""}
                </span>
              </Td>
              <Td>{p.status || "pending"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-3 py-2 text-left font-semibold text-gray-700">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}
