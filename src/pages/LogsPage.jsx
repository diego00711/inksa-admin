import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Search, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiBase';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [exporting, setExporting] = useState(false);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [admin, setAdmin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('-timestamp');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const abortControllerRef = useRef(null);

  // Initialize state from URL params
  useEffect(() => {
    const page = parseInt(searchParams.get('page')) || 1;
    const size = parseInt(searchParams.get('page_size')) || 20;
    const searchParam = searchParams.get('search') || '';
    const actionParam = searchParams.get('action') || '';
    const adminParam = searchParams.get('admin') || '';
    const startParam = searchParams.get('start') || '';
    const endParam = searchParams.get('end') || '';
    const sortParam = searchParams.get('sort') || '-timestamp';

    setCurrentPage(page);
    setPageSize(size);
    setSearch(searchParam);
    setAction(actionParam);
    setAdmin(adminParam);
    setStartDate(startParam);
    setEndDate(endParam);
    setSort(sortParam);
  }, [searchParams]);

  // Update URL when params change
  const updateUrlParams = useCallback((newParams) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Fetch logs from server
  const fetchLogs = useCallback(async () => {
    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        sort: sort,
      });

      if (search) params.set('search', search);
      if (action) params.set('action', action);
      if (admin) params.set('admin', admin);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);

      const response = await fetch(`${API_BASE_URL}/api/logs?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar logs');
      }

      const data = await response.json();
      
      setLogs(data.items || []);
      setTotalCount(data.total || 0);
      setHasNext(data.has_next || false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [currentPage, pageSize, search, action, admin, startDate, endDate, sort]);

  // Fetch logs when dependencies change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle filter changes - reset to page 1 when filters change
  const handleFilterChange = (key, value) => {
    const newPage = key === 'page' || key === 'page_size' ? currentPage : 1;
    
    const newParams = {
      page: newPage.toString(),
      page_size: pageSize.toString(),
      sort,
      search: key === 'search' ? value : search,
      action: key === 'action' ? value : action,
      admin: key === 'admin' ? value : admin,
      start: key === 'start' ? value : startDate,
      end: key === 'end' ? value : endDate,
    };

    if (key === 'page') newParams.page = value.toString();
    if (key === 'page_size') newParams.page_size = value.toString();
    if (key === 'sort') newParams.sort = value;

    updateUrlParams(newParams);
  };

  // Handle CSV export
  const handleExport = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams({
        limit: '5000',
      });

      if (search) params.set('search', search);
      if (action) params.set('action', action);
      if (admin) params.set('admin', admin);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);

      const url = `${API_BASE_URL}/api/logs/export?${params.toString()}`;
      window.open(url, '_blank');
    } catch (err) {
      setError('Erro ao exportar CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Logs & Auditoria</h1>
        <p className="text-gray-600">Visualize e filtre os logs de atividades do sistema</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar (detalhes)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Buscar nos detalhes..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Action */}
          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
              Ação
            </label>
            <input
              id="action"
              type="text"
              value={action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="Ex: Login, Logout..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Admin */}
          <div>
            <label htmlFor="admin" className="block text-sm font-medium text-gray-700 mb-1">
              Admin
            </label>
            <input
              id="admin"
              type="text"
              value={admin}
              onChange={(e) => handleFilterChange('admin', e.target.value)}
              placeholder="Ex: admin@inksa.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange('start', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange('end', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Ordenação
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="-timestamp">Mais recentes</option>
              <option value="timestamp">Mais antigos</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar CSV
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600" aria-live="polite">
              {loading ? 'Carregando...' : `${totalCount} registros encontrados`}
            </span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500">
            <p className="text-red-700">Erro: {error}</p>
          </div>
        )}

        {loading && (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Carregando logs...</p>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum log encontrado com os filtros aplicados.</p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Data/Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Admin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ação</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-gray-900">{log.admin}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-md truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="page-size" className="text-sm text-gray-700">
                      Itens por página:
                    </label>
                    <select
                      id="page-size"
                      value={pageSize}
                      onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value))}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages} ({totalCount} registros)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </button>
                  
                  <button
                    onClick={() => handleFilterChange('page', currentPage + 1)}
                    disabled={!hasNext || loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
