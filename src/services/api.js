// src/services/api.js
import axios from 'axios';

// Use VITE_API_BASE_URL em produção. Em dev, pode cair no mesmo host.
const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  window.__API_BASE_URL__ || // opcional: caso você injete via <script>
  '';

const api = axios.create({
  baseURL, // ex.: https://inksa-auth-flask-dev.onrender.com
  withCredentials: true,
});

// Anexa o Bearer automaticamente quando existir token salvo
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (raw) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${raw}`;
    }
  } catch (_) {}
  return config;
});

// Normaliza erros
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // você pode tratar 401 aqui e redirecionar p/ login, se quiser
    return Promise.reject(err);
  }
);

export default api;
