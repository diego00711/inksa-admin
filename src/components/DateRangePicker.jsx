export default function DateRangePicker({ from, to, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-gray-600">
        De:
        <input
          type="date"
          className="ml-2 rounded border px-2 py-1"
          value={from || ''}
          onChange={(e) => onChange({ from: e.target.value, to })}
        />
      </label>
      <label className="text-sm text-gray-600">
        Até:
        <input
          type="date"
          className="ml-2 rounded border px-2 py-1"
          value={to || ''}
          onChange={(e) => onChange({ from, to: e.target.value })}
        />
      </label>
    </div>
  );
}
