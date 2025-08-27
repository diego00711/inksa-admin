import React from 'react';
import { ChevronUp, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';

/**
 * DataTable component for displaying sortable tabular data
 */
const DataTable = ({
    data = [],
    columns = [],
    sortBy,
    sortOrder,
    onSort,
    loading = false,
    error = null,
    emptyMessage = 'Nenhum resultado encontrado.',
    className = ''
}) => {
    const handleSort = (columnKey) => {
        if (!onSort) return;
        
        let newOrder = 'asc';
        if (sortBy === columnKey && sortOrder === 'asc') {
            newOrder = 'desc';
        }
        
        onSort(columnKey, newOrder);
    };

    const getSortIcon = (columnKey) => {
        if (sortBy !== columnKey) {
            return <ChevronUp className="h-4 w-4 text-gray-300" />;
        }
        
        return sortOrder === 'asc' 
            ? <ChevronUp className="h-4 w-4 text-blue-600" />
            : <ChevronDown className="h-4 w-4 text-blue-600" />;
    };

    const formatCellValue = (value, column) => {
        if (value === null || value === undefined) {
            return '-';
        }

        // Apply custom formatter if provided
        if (column.formatter) {
            return column.formatter(value);
        }

        // Default formatting for common types
        if (column.type === 'date' || column.key === 'timestamp') {
            try {
                return new Date(value).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            } catch (e) {
                return value;
            }
        }

        if (column.key === 'level') {
            const levelColors = {
                debug: 'text-gray-600 bg-gray-100',
                info: 'text-blue-600 bg-blue-100',
                warn: 'text-yellow-600 bg-yellow-100',
                error: 'text-red-600 bg-red-100'
            };
            
            const colorClass = levelColors[value?.toLowerCase()] || 'text-gray-600 bg-gray-100';
            
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                    {value?.toUpperCase() || 'UNKNOWN'}
                </span>
            );
        }

        return value;
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
                <div className="flex items-center justify-center py-12">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <div className="ml-2">
                        <p className="text-red-600 font-medium">Erro ao carregar dados</p>
                        <p className="text-gray-600 text-sm">{error.message || 'Erro desconhecido'}</p>
                        {error.retry && (
                            <button
                                onClick={error.retry}
                                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Tentar novamente
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                        column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                                    }`}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                    aria-label={column.sortable !== false ? `Ordenar por ${column.label}` : column.label}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>{column.label}</span>
                                        {column.sortable !== false && getSortIcon(column.key)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, index) => (
                            <tr key={row.id || index} className="hover:bg-gray-50">
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                                            column.className || 'text-gray-900'
                                        }`}
                                    >
                                        {formatCellValue(row[column.key], column)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;