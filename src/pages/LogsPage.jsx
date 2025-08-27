import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import { parseUrlParams, updateUrl, buildCsvFilename, debounce } from '../utils/url';

/**
 * Admin Logs Page with full filtering, pagination, sorting and CSV export
 */
export default function LogsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const abortControllerRef = useRef(null);
    
    // State management
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        per_page: 25
    });

    // Parse filters from URL
    const getFiltersFromUrl = useCallback(() => {
        const searchParams = new URLSearchParams(location.search);
        const urlParams = parseUrlParams(searchParams);
        
        return {
            page: parseInt(urlParams.page) || 1,
            per_page: parseInt(urlParams.per_page) || 25,
            sort_by: urlParams.sort_by || 'timestamp',
            order: urlParams.order || 'desc',
            q: urlParams.q || '',
            level: urlParams.level || '',
            action: urlParams.action || '',
            actor: urlParams.actor || '',
            date_from: urlParams.date_from || '',
            date_to: urlParams.date_to || ''
        };
    }, [location.search]);

    const [filters, setFilters] = useState(getFiltersFromUrl);

    // Table columns definition
    const columns = [
        {
            key: 'timestamp',
            label: 'Data/Hora',
            type: 'date',
            sortable: true
        },
        {
            key: 'level',
            label: 'Nível',
            sortable: true
        },
        {
            key: 'action',
            label: 'Ação/Evento',
            sortable: true,
            className: 'max-w-xs'
        },
        {
            key: 'actor',
            label: 'Usuário',
            sortable: true,
            className: 'max-w-xs'
        },
        {
            key: 'resource',
            label: 'Recurso',
            sortable: false,
            className: 'max-w-xs text-gray-600'
        },
        {
            key: 'message',
            label: 'Mensagem',
            sortable: false,
            className: 'max-w-md text-gray-800'
        },
        {
            key: 'ip',
            label: 'IP',
            sortable: false,
            className: 'text-gray-500 font-mono text-xs'
        }
    ];

    // Fetch logs data
    const fetchLogs = useCallback(async (currentFilters) => {
        // Cancel previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            // Build query parameters
            const queryParams = new URLSearchParams();
            Object.entries(currentFilters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.set(key, value.toString());
                }
            });

            // Make API request
            const response = await apiClient.get(
                `/api/admin/logs?${queryParams.toString()}`,
                { signal: abortControllerRef.current.signal }
            );

            // Handle different response formats
            let logsData = [];
            let metaData = {
                total: 0,
                page: currentFilters.page,
                per_page: currentFilters.per_page
            };

            if (Array.isArray(response)) {
                // Response is a simple array
                logsData = response;
                metaData.total = response.length;
            } else if (response.data && Array.isArray(response.data)) {
                // Response has data and meta structure
                logsData = response.data;
                if (response.meta) {
                    metaData = {
                        ...metaData,
                        ...response.meta
                    };
                } else {
                    // Try to infer total from headers or data length
                    metaData.total = response.total || logsData.length;
                }
            } else {
                // Unexpected format, try to handle gracefully
                console.warn('Unexpected API response format:', response);
                logsData = [];
            }

            setLogs(logsData);
            setMeta(metaData);
        } catch (err) {
            // Don't set error if request was aborted
            if (err.name !== 'AbortError') {
                console.error('Erro ao buscar logs:', err);
                setError({
                    message: err.message || 'Erro ao carregar logs',
                    retry: () => fetchLogs(currentFilters)
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced filter change handler
    const debouncedFetchLogs = useCallback(
        debounce((newFilters) => {
            fetchLogs(newFilters);
        }, 300),
        [fetchLogs]
    );

    // Handle filter changes
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
        updateUrl(newFilters);
        
        // Only debounce text search, apply other filters immediately
        if (newFilters.q !== filters.q) {
            debouncedFetchLogs(newFilters);
        } else {
            fetchLogs(newFilters);
        }
    }, [filters, fetchLogs, debouncedFetchLogs]);

    // Handle sorting
    const handleSort = useCallback((sortBy, order) => {
        const newFilters = {
            ...filters,
            sort_by: sortBy,
            order: order,
            page: 1 // Reset to first page
        };
        handleFilterChange(newFilters);
    }, [filters, handleFilterChange]);

    // Handle pagination
    const handlePageChange = useCallback((page) => {
        const newFilters = { ...filters, page };
        handleFilterChange(newFilters);
    }, [filters, handleFilterChange]);

    const handlePageSizeChange = useCallback((perPage) => {
        const newFilters = { 
            ...filters, 
            per_page: perPage, 
            page: 1 // Reset to first page
        };
        handleFilterChange(newFilters);
    }, [filters, handleFilterChange]);

    // Handle CSV export
    const handleExport = useCallback(async () => {
        setIsExporting(true);
        
        try {
            // Build query parameters for export (same as current view)
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '' && key !== 'page' && key !== 'per_page') {
                    queryParams.set(key, value.toString());
                }
            });

            const filename = buildCsvFilename('logs');
            await apiClient.download(
                `/api/admin/logs/export?${queryParams.toString()}`,
                filename
            );
        } catch (err) {
            console.error('Erro ao exportar CSV:', err);
            setError({
                message: err.message || 'Erro ao exportar dados',
                retry: null
            });
        } finally {
            setIsExporting(false);
        }
    }, [filters]);

    // Update filters when URL changes (browser back/forward)
    useEffect(() => {
        const newFilters = getFiltersFromUrl();
        setFilters(newFilters);
        fetchLogs(newFilters);
    }, [location.search, getFiltersFromUrl, fetchLogs]);

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const totalPages = Math.ceil(meta.total / meta.per_page) || 1;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Logs & Auditoria</h1>
                    <p className="text-gray-600">
                        Visualize e monitore todas as atividades do sistema
                    </p>
                </div>
            </div>

            {/* Filters */}
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onExport={handleExport}
                isExporting={isExporting}
            />

            {/* Data Table */}
            <DataTable
                data={logs}
                columns={columns}
                sortBy={filters.sort_by}
                sortOrder={filters.order}
                onSort={handleSort}
                loading={loading}
                error={error}
                emptyMessage="Nenhum log encontrado com os filtros aplicados."
            />

            {/* Pagination */}
            {!loading && !error && logs.length > 0 && (
                <Pagination
                    currentPage={meta.page}
                    totalPages={totalPages}
                    pageSize={meta.per_page}
                    totalItems={meta.total}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    );
}
