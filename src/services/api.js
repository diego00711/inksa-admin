// src/services/api.js
import { supabase } from '../lib/supabaseClient';

export async function createAuthHeaders(extra = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  } catch (e) {
    console.error('Erro ao recuperar token:', e);
    return { 'Content-Type': 'application/json', ...extra };
  }
}

export const API_BASE = import.meta.env.VITE_API_URL || 'https://inksa-auth-flask-dev.onrender.com';
