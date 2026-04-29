import React, { useEffect, useState, useMemo } from 'react';
import { Search, RefreshCw, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import authService from '../services/authService';

const PAGE_SIZE = 25;

function buildQueryString(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  return q.toString();
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (currentPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = authService.getToken();
      const qs = buildQueryString({
        page: currentPage,
        per_page: PAGE_SIZE,
        action: actionFilter || undefined,
        q: search || undefined,
      });

      // Tenta /api/admin/logs primeiro, fallback para /api/logs
      const endpoints = [
        `${API_BASE_URL}/api/admin/logs${qs ? `?${qs}` : ''}`,
        `${API_BASE_URL}/api/logs${qs ? `?${qs}` : ''}`,
      ];

      let data = null;
      for (const url of endpoints) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          data = await res.json();
          break;
        }
      }

      if (!data) throw new Error('Nenhum endpoint de logs respondeu com sucesso');

      const items = data.data || data.logs || data.items || data;
      setLogs(Array.isArray(items) ? items : []);
      const total = data.total_pages || data.pages || Math.ceil((data.total || items.length) / PAGE_SIZE) || 1;
      setTotalPages(Math.max(1, total));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const lower = search.toLowerCase();
    return logs.filter(
      (log) =>
        (log.action || '').toLowerCase().includes(lower) ||
        (log.admin || log.admin_email || '').toLowerCase().includes(lower) ||
        (log.details || log.description || '').toLowerCase().includes(lower)
    );
  }, [logs, search]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(actions).sort();
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Logs & Auditoria
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Histórico de ações dos administradores</p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ação, admin ou detalhes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[180px]"
        >
          <option value="">Todas as ações</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">Erro ao carregar logs</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button
              onClick={() => fetchLogs(page)}
              className="mt-4 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>Nenhum log encontrado{search ? ' para a busca atual' : ''}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">
                    Data/Hora
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Admin</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Ação</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                      {log.timestamp || log.created_at
                        ? new Date(log.timestamp || log.created_at).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-800">
                        {log.admin || log.admin_email || log.admin_name || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {log.action || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={log.details || log.description || ''}>
                      {log.details || log.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
