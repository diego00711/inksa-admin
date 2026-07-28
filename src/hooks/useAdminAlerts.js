import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/api';
import { apiFetch } from '../services/apiClient';

const EMPTY = {
  tickets_open: 0,
  tickets_waiting: 0,
  incidents_pending: 0,
  restaurants_pending: 0,
  total: 0,
};

// Avisos do admin: faz polling leve de /api/admin/alerts-summary (só COUNTs) pra
// alimentar o sino/badges do menu. `onNew(delta, alerts)` dispara quando o total
// AUMENTA (chegou algo novo) — o layout usa pra tocar um toast.
export function useAdminAlerts({ pollMs = 45000, onNew } = {}) {
  const [alerts, setAlerts] = useState(EMPTY);
  const aliveRef = useRef(true);
  const prevTotalRef = useRef(null); // null = primeira leitura (não alarma)
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const fetchAlerts = useCallback(async () => {
    try {
      const t = localStorage.getItem('adminAuthToken');
      if (!t) return;
      const r = await apiFetch(`${API_BASE_URL}/api/admin/alerts-summary`, {
        headers: { Authorization: `Bearer ${t}` },
        credentials: 'include',
      });
      if (!r.ok || !aliveRef.current) return;
      const data = await r.json();
      if (!data || typeof data !== 'object') return;
      const next = { ...EMPTY, ...data };
      setAlerts(next);
      // Aviso de "chegou algo novo": só quando o total sobe (não na 1ª leitura).
      if (prevTotalRef.current !== null && next.total > prevTotalRef.current) {
        try { onNewRef.current?.(next.total - prevTotalRef.current, next); } catch { /* noop */ }
      }
      prevTotalRef.current = next.total;
    } catch { /* silencioso — sem net, não alarma */ }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    fetchAlerts();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchAlerts();
    }, pollMs);
    return () => { aliveRef.current = false; clearInterval(id); };
  }, [fetchAlerts, pollMs]);

  return alerts;
}

export default useAdminAlerts;
