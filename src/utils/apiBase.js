/**
 * Centralized API base URL configuration
 * Uses environment variables with sensible fallback
 */

const getApiBaseUrl = () => {
  // Prefer VITE_API_BASE_URL for Vite projects
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Fallback to REACT_APP_API_BASE_URL for CRA compatibility
  if (import.meta.env.VITE_REACT_APP_API_BASE_URL) {
    return import.meta.env.VITE_REACT_APP_API_BASE_URL;
  }
  
  // Final fallback to production default
  return 'https://inksa-auth-flask-dev.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;