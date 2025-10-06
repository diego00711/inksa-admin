import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = 'https://inksa-auth-flask-dev.onrender.com';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // filtros
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [admin, setAdmin] = useState('');
  const [start, setStart] = useState(''); // YYYY-MM-DD
  const [end, setEnd] = useState('');     // YYYY-MM-DD

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (action) p.set('action', action);
    if (admin) p.set('admin', admin);
    if (start) p.set('start', start);
    if (end) p.set('end', end);
    p.set('page', String(page));
    p.set('page_size', String(pageSize));
    p.set('sort', '-timestamp');
    return p.toString();
  }, [search, action, admin, start, end, page, pageSize]);

  useEffect(() => {
    setLoading(true);
    setErro(null);
    fetch(`${API_BASE}/api/logs?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar logs');
        return res.json();
      })
      .then((data) => {
        setLogs(data.items || []);
        setTotal(data.total || 0);
        setHasNext(Boolean(data.has_next));
        setLoading(false);
      })
      .catch((err) => {
        setErro(err.message);
        setLoading(false);
      });
  }, [params]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(1); // reset página ao aplicar filtros
  };

  const handleClear = () => {
    setSearch('');
    setAction('');
    setAdmin('');
    setStart('');
    setEnd('');
    setPage(1);
  };

  const exportHref = useMemo(() => {
    const ep = new URLSearchParams();
    if (search) ep.set('search', search);
    if (action) ep.set('action', action);
    if (admin) ep.set('admin', admin);
    if (start) ep.set('start', start);
    if (end) ep.set('end', end);
    ep.set('sort', '-timestamp');
    ep.set('limit', '5000');
    return `${API_BASE}/api/logs/export?${ep.toString()}`;
  }, [search, action, admin, start, end]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Logs & Auditoria</h1>

      <form onSubmit={handleApplyFilters} className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Busca (detalhes)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Ação (ex: Login)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Admin (email)"
          value={admin}
          onChange={(e) => setAdmin(e.target.value)}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Aplicar</button>
          <button type="button" onClick={handleClear} className="border px-4 py-2 rounded">Limpar</button>
          <a href={exportHref} className="border px-4 py-2 rounded" target="_blank" rel="noreferrer">Exportar CSV</a>
        </div>
      </form>

      <div className="bg-white p-6 rounded shadow">
        {loading && <p>Carregando logs...</p>}
        {erro && <p className="text-red-500">Erro: {erro}</p>}
        {!loading && !erro && logs.length === 0 && (
          <p>Nenhum log encontrado.</p>
        )}
        {!loading && !erro && logs.length > 0 && (
          <>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-4">Data/Hora</th>
                    <th className="text-left py-2 px-4">Admin</th>
                    <th className="text-left py-2 px-4">Ação</th>
                    <th className="text-left py-2 px-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 px-4">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                      <td className="py-2 px-4">{log.admin || '-'}</td>
                      <td className="py-2 px-4">{log.action || '-'}</td>
                      <td className="py-2 px-4">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600">
                Total: {total} • Página {page}
              </span>
              <div className="flex gap-2">
                <button
                  className="border px-3 py-1 rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </button>
                <button
                  className="border px-3 py-1 rounded disabled:opacity-50"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext || loading}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
