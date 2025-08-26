/**
 * Centralized API client for making requests to the backend
 * Uses VITE_API_BASE_URL environment variable with fallback
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://inksa-auth-flask-dev.onrender.com';
const AUTH_TOKEN_KEY = 'adminAuthToken';

/**
 * Get the authorization headers for authenticated requests
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Process API response and handle common error cases
 */
const processResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
    return null;
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Make a GET request with optional query parameters
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} params - Query parameters object
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise} API response data
 */
export const apiGet = async (endpoint, params = {}, signal = null) => {
  const url = new URL(endpoint, API_BASE_URL);
  
  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    signal,
  });

  return processResponse(response);
};

/**
 * Build an absolute URL for downloads/exports
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} params - Query parameters object
 * @returns {string} Complete URL with query parameters
 */
export const buildDownloadUrl = (endpoint, params = {}) => {
  const url = new URL(endpoint, API_BASE_URL);
  
  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });

  // Add auth token for authenticated downloads
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    url.searchParams.append('token', token);
  }

  return url.toString();
};

/**
 * Get the API base URL for external use
 */
export const getApiBaseUrl = () => API_BASE_URL;

export default {
  get: apiGet,
  buildDownloadUrl,
  getApiBaseUrl,
};