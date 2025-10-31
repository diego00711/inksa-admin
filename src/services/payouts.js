// src/services/payouts.js
import { api } from './api';

/**
 * Dispara o processamento de payouts no backend.
 * @param {"restaurant"|"delivery"} partnerType
 * @param {"weekly"|"bi-weekly"|"monthly"} cycleType
 */
export async function processPayouts(partnerType, cycleType) {
  return api.request('/api/admin/payouts/process', {
    method: 'POST',
    body: {
      partner_type: partnerType,
      cycle_type: cycleType,
    },
  });
}

// (opcional) se quiser listar históricos no futuro
export async function listPayouts(params) {
  return api.request('/api/admin/payouts', { params });
}
