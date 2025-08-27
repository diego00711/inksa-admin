import React from 'react';
import { Search, Calendar, Filter, Download } from 'lucide-react';

/**
 * FilterBar component for the logs page
 * Provides search, filtering, and export controls
 */
const FilterBar = ({
    filters,
    onFilterChange,
    onExport,
    isExporting = false,
    className = ''
}) => {
    const handleInputChange = (field, value) => {
        onFilterChange({
            ...filters,
            [field]: value,
            page: 1 // Reset to first page when filters change
        });
    };

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border ${className}`}>
            {/* Search and Level Filter Row */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar em mensagens e contexto..."
                        value={filters.q || ''}
                        onChange={(e) => handleInputChange('q', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Level Filter */}
                <div className="min-w-[140px]">
                    <select
                        value={filters.level || ''}
                        onChange={(e) => handleInputChange('level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Todos os níveis</option>
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                {/* Export Button */}
                <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exportando...' : 'Exportar CSV'}
                </button>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Action Filter */}
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Filtrar por ação/evento..."
                        value={filters.action || ''}
                        onChange={(e) => handleInputChange('action', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Actor Filter */}
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Filtrar por usuário/admin..."
                        value={filters.actor || ''}
                        onChange={(e) => handleInputChange('actor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Date From */}
                <div className="min-w-[140px]">
                    <input
                        type="date"
                        value={filters.date_from || ''}
                        onChange={(e) => handleInputChange('date_from', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        aria-label="Data inicial"
                    />
                </div>

                {/* Date To */}
                <div className="min-w-[140px]">
                    <input
                        type="date"
                        value={filters.date_to || ''}
                        onChange={(e) => handleInputChange('date_to', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        aria-label="Data final"
                    />
                </div>

                {/* Clear Filters Button */}
                {(filters.q || filters.level || filters.action || filters.actor || filters.date_from || filters.date_to) && (
                    <button
                        onClick={() => onFilterChange({ 
                            page: 1, 
                            per_page: filters.per_page, 
                            sort_by: filters.sort_by, 
                            order: filters.order 
                        })}
                        className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Filter className="h-4 w-4" />
                        Limpar
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;