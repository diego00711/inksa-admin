import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination component with page navigation and page size selector
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    pageSize = 25,
    totalItems = 0,
    onPageChange,
    onPageSizeChange,
    className = ''
}) => {
    const pageSizeOptions = [10, 25, 50, 100];

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
        }
    };

    const handlePageSizeChange = (newPageSize) => {
        if (onPageSizeChange) {
            onPageSizeChange(parseInt(newPageSize));
        }
    };

    // Calculate page range to show
    const getPageRange = () => {
        const delta = 2; // Number of pages to show on each side
        const range = [];
        const rangeWithDots = [];

        // Always include first page
        if (totalPages <= 1) {
            return [1];
        }

        // Calculate start and end of the range around current page
        let start = Math.max(2, currentPage - delta);
        let end = Math.min(totalPages - 1, currentPage + delta);

        // Add first page
        rangeWithDots.push(1);

        // Add dots before if there's a gap
        if (start > 2) {
            rangeWithDots.push('...');
        }

        // Add pages in range
        for (let i = start; i <= end; i++) {
            rangeWithDots.push(i);
        }

        // Add dots after if there's a gap
        if (end < totalPages - 1) {
            rangeWithDots.push('...');
        }

        // Add last page if it's not already included
        if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    const pageRange = getPageRange();
    const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className={`bg-white border-t px-4 py-3 sm:px-6 ${className}`}>
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                {/* Results info and page size selector */}
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="text-sm text-gray-700">
                        Mostrando{' '}
                        <span className="font-medium">{startItem}</span>
                        {' '}-{' '}
                        <span className="font-medium">{endItem}</span>
                        {' '}de{' '}
                        <span className="font-medium">{totalItems}</span>
                        {' '}resultados
                    </div>

                    <div className="flex items-center space-x-2">
                        <label htmlFor="pageSize" className="text-sm text-gray-700">
                            Por página:
                        </label>
                        <select
                            id="pageSize"
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Page navigation */}
                <div className="flex items-center space-x-1">
                    {/* First page button */}
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Primeira página"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>

                    {/* Previous page button */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Página anterior"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                        {pageRange.map((page, index) => (
                            page === '...' ? (
                                <span key={`dots-${index}`} className="px-3 py-2 text-gray-500">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                                        currentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    aria-label={`Página ${page}`}
                                    aria-current={currentPage === page ? 'page' : undefined}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    {/* Next page button */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Próxima página"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Last page button */}
                    <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Última página"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;