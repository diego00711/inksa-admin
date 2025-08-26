import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiGet, buildDownloadUrl } from '../services/api';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    has_next: false
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    admin: '',
    start: '',
    end: '',
    sort: '-timestamp'
  });

  // Export limit state
  const [exportLimit, setExportLimit] = useState(5000);

  // Refs for debouncing and cancellation
  const debounceTimeout = useRef(null);
  const abortController = useRef(null);

  // Debounced search input handler
  const handleSearchChange = useCallback((value) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
    }, 300);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  }, []);

  // Handle pagination changes
  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPagination(prev => ({ ...prev, page: 1, page_size: newPageSize }));
  }, []);

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    // Cancel any in-flight request
    if (abortController.current) {
      abortController.current.abort();
    }

    // Create new abort controller
    abortController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size
      };

      const response = await apiGet('/api/logs', params, abortController.current.signal);
      
      if (response) {
        setLogs(response.logs || []);
        setPagination(prev => ({
          ...prev,
          total: response.total || 0,
          has_next: response.has_next || false
        }));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setLogs([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.page_size]);

  // Effect to fetch logs when filters or pagination change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.total / pagination.page_size);
  const startItem = (pagination.page - 1) * pagination.page_size + 1;
  const endItem = Math.min(pagination.page * pagination.page_size, pagination.total);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // Handle CSV export
  const handleExport = () => {
    const exportParams = {
      ...filters,
      limit: exportLimit
    };
    
    const exportUrl = buildDownloadUrl('/api/logs/export', exportParams);
    window.open(exportUrl, '_blank');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Logs & Auditoria</h1>
      
      {/* Filters */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar em detalhes..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Action filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ação
            </label>
            <input
              type="text"
              placeholder="Ex: Login, Create User..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            />
          </div>

          {/* Admin filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin
            </label>
            <input
              type="text"
              placeholder="Email do admin..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.admin}
              onChange={(e) => handleFilterChange('admin', e.target.value)}
            />
          </div>

          {/* Start date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.start}
              onChange={(e) => handleFilterChange('start', e.target.value)}
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.end}
              onChange={(e) => handleFilterChange('end', e.target.value)}
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordenação
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
            >
              <option value="-timestamp">Mais recente primeiro</option>
              <option value="timestamp">Mais antigo primeiro</option>
            </select>
          </div>
        </div>

        {/* Export section */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Limite de exportação:
            </label>
            <select
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={exportLimit}
              onChange={(e) => setExportLimit(parseInt(e.target.value))}
            >
              <option value={1000}>1.000</option>
              <option value={5000}>5.000</option>
              <option value={10000}>10.000</option>
              <option value={25000}>25.000</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white p-6 rounded shadow">
        {/* Results info and page size selector */}
        <div className="flex flex-wrap justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            {loading ? (
              'Carregando...'
            ) : error ? (
              `Erro: ${error}`
            ) : (
              `Mostrando ${startItem}-${endItem} de ${pagination.total} logs`
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Itens por página:</label>
            <select
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={pagination.page_size}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Carregando logs...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-8">
            <p className="text-red-500">Erro: {error}</p>
            <button
              onClick={fetchLogs}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum log encontrado.</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Data/Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Admin</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Ação</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4 text-gray-900">{log.id}</td>
                    <td className="py-3 px-4 text-gray-900">
                      {new Date(log.timestamp).toLocaleString('pt-BR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{log.admin}</td>
                    <td className="py-3 px-4 text-gray-900">{log.action}</td>
                    <td className="py-3 px-4 text-gray-900">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && logs.length > 0 && totalPages > 1 && (
          <div className="flex flex-wrap justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Página {pagination.page} de {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className={`px-3 py-2 border rounded-md ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next || loading}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
