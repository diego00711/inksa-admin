export default function KpiCard({ title, value, icon, help }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon ? <span className="text-gray-400">{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-800">{value ?? '-'}</div>
      {help ? <div className="mt-1 text-xs text-gray-400">{help}</div> : null}
    </div>
  );
}
