// src/services/payouts.js
import { apiRequest } from './api';

/**
 * Dispara o processamento de payouts no backend.
 * @param {"restaurant"|"delivery"} partnerType
 * @param {"weekly"|"bi-weekly"|"monthly"} cycleType
 */
export async function processPayouts(partnerType, cycleType) {
  return apiRequest('/api/admin/payouts/process', {
    method: 'POST',
    body: {
      partner_type: partnerType,
      cycle_type: cycleType,
    },
  });
}
