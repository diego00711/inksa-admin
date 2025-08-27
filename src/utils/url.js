/**
 * URL parameter utilities for managing filter state in query strings
 */

/**
 * Parse URL search params into an object
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {Object} - Parsed parameters object
 */
export const parseUrlParams = (searchParams) => {
    const params = {};
    
    for (const [key, value] of searchParams.entries()) {
        if (value && value.trim()) {
            params[key] = value.trim();
        }
    }
    
    return params;
};

/**
 * Build URL search params from an object, filtering out empty values
 * @param {Object} params - Parameters object
 * @returns {URLSearchParams} - URL search parameters
 */
export const buildUrlParams = (params) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            searchParams.set(key, value.toString());
        }
    });
    
    return searchParams;
};

/**
 * Update URL without causing a page reload
 * @param {Object} params - New parameters
 * @param {Object} options - Options
 * @param {boolean} options.replace - Whether to replace current history entry
 */
export const updateUrl = (params, { replace = false } = {}) => {
    const searchParams = buildUrlParams(params);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    
    if (replace) {
        window.history.replaceState({}, '', newUrl);
    } else {
        window.history.pushState({}, '', newUrl);
    }
};

/**
 * Format date for CSV filename
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const formatDateForFilename = (date = new Date()) => {
    return date.toISOString().split('T')[0];
};

/**
 * Build CSV filename with current date
 * @param {string} prefix - Filename prefix
 * @param {Date} date - Date object
 * @returns {string} - Complete filename
 */
export const buildCsvFilename = (prefix = 'logs', date = new Date()) => {
    return `${prefix}_${formatDateForFilename(date)}.csv`;
};

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};