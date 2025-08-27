export default function TransactionsTable({ items = [], loading }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Pedido</th>
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Restaurante</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Pagamento</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">Carregando...</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">Sem transações</td></tr>
          ) : (
            items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">#{t.order_code || t.order_id || t.id}</td>
                <td className="px-3 py-2">{t.customer_name || '-'}</td>
                <td className="px-3 py-2">{t.restaurant_name || '-'}</td>
                <td className="px-3 py-2 font-medium">R$ {Number(t.amount || 0).toFixed(2)}</td>
                <td className="px-3 py-2">{t.status || '-'}</td>
                <td className="px-3 py-2">{t.payment_method || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
