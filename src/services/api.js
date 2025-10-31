// src/services/api.js
import { supabase } from '../lib/supabaseClient';

// Base do backend Flask
export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';

/**
 * Cria headers com Authorization: Bearer <access_token> do Supabase.
 * Usa também Content-Type: application/json por padrão.
 */
export async function createAuthHeaders(extra = {}) {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token || null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  } catch (e) {
    console.error('Erro ao recuperar token:', e);
    // retorna ao menos o content-type para chamadas públicas
    return { 'Content-Type': 'application/json', ...extra };
  }
}

/**
 * Utilitário padronizado de fetch com parse de JSON e tratamento básico de erro.
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Erro HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}
