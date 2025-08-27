/**
 * Centralized API client for Inksa Admin
 * 
 * Provides a consistent interface for making HTTP requests with:
 * - Configurable base URL from environment variables
 * - Automatic authentication token handling
 * - Standardized error handling
 * - Request timeout and cancellation support
 * - Simple retry logic for network errors
 */

// Get API base URL from environment, default to empty string for same-origin
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Auth token key (keeping consistent with existing authService)
const AUTH_TOKEN_KEY = 'adminAuthToken';

/**
 * Standard error shape returned by the API client
 * @typedef {Object} ApiError
 * @property {number} status - HTTP status code
 * @property {string} message - Error message
 * @property {any} [details] - Additional error details
 */

/**
 * Sleep utility for retry logic
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process response and handle common error cases
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} - Parsed response data
 * @throws {ApiError} - Standardized error object
 */
const processResponse = async (response) => {
    // Handle authentication failures
    if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('adminUser');
        window.location.href = '/login';
        throw {
            status: 401,
            message: 'Sessão expirada. Redirecionando para login...',
            details: null
        };
    }
    
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetails = null;
        
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorDetails = errorData.details || errorData;
        } catch (e) {
            // Response is not JSON, use default message
        }
        
        throw {
            status: response.status,
            message: errorMessage,
            details: errorDetails
        };
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    
    return response;
};

/**
 * Build headers for requests
 * @param {Object} options - Request options
 * @param {boolean} options.includeAuth - Whether to include auth token
 * @param {Object} options.headers - Additional headers
 * @returns {Object} - Headers object
 */
const buildHeaders = ({ includeAuth = true, headers = {} } = {}) => {
    const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
    };
    
    // Add auth token if available and requested
    if (includeAuth) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }
    
    return requestHeaders;
};

/**
 * Make HTTP request with retry logic
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retry attempts remaining
 * @returns {Promise<any>} - Response data
 */
const makeRequest = async (url, options = {}, retries = 1) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return await processResponse(response);
    } catch (error) {
        clearTimeout(timeoutId);
        
        // If it's an AbortError due to timeout, don't retry
        if (error.name === 'AbortError') {
            throw {
                status: 408,
                message: 'Timeout da requisição',
                details: error
            };
        }
        
        // If it's a network error and we have retries left, try again
        if (retries > 0 && (error.name === 'TypeError' || error.status >= 500)) {
            await sleep(1000); // Wait 1 second before retry
            return makeRequest(url, options, retries - 1);
        }
        
        // If it's already our standardized error format, re-throw
        if (error.status && error.message) {
            throw error;
        }
        
        // Convert unknown errors to our format
        throw {
            status: 0,
            message: error.message || 'Erro de conexão',
            details: error
        };
    }
};

/**
 * API client with standard HTTP methods
 */
const apiClient = {
    /**
     * GET request
     * @param {string} endpoint - API endpoint (relative to base URL)
     * @param {Object} options - Request options
     * @returns {Promise<any>} - Response data
     */
    async get(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = buildHeaders(options);
        
        return makeRequest(url, {
            method: 'GET',
            headers,
            ...options
        });
    },
    
    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<any>} - Response data
     */
    async post(endpoint, data = null, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = buildHeaders(options);
        
        return makeRequest(url, {
            method: 'POST',
            headers,
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    },
    
    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<any>} - Response data
     */
    async put(endpoint, data = null, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = buildHeaders(options);
        
        return makeRequest(url, {
            method: 'PUT',
            headers,
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    },
    
    /**
     * PATCH request
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<any>} - Response data
     */
    async patch(endpoint, data = null, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = buildHeaders(options);
        
        return makeRequest(url, {
            method: 'PATCH',
            headers,
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    },
    
    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} - Response data
     */
    async delete(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = buildHeaders(options);
        
        return makeRequest(url, {
            method: 'DELETE',
            headers,
            ...options
        });
    },
    
    /**
     * Download file (for CSV exports, etc.)
     * @param {string} endpoint - API endpoint
     * @param {string} filename - Filename for download
     * @param {Object} options - Request options
     * @returns {Promise<void>}
     */
    async download(endpoint, filename, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = buildHeaders({
            ...options,
            headers: {
                // Don't set Content-Type for downloads, let browser determine
                ...options.headers
            }
        });
        delete headers['Content-Type'];
        
        const response = await fetch(url, {
            method: 'GET',
            headers,
            ...options
        });
        
        if (!response.ok) {
            // Try to get error message from response
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Response is not JSON, use default message
            }
            
            throw {
                status: response.status,
                message: errorMessage,
                details: null
            };
        }
        
        // Create download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }
};

export default apiClient;