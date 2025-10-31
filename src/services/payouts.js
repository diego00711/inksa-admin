// src/services/payouts.js
import { createAuthHeaders, apiFetch } from './api';

/**
 * Dispara o processamento de payouts no backend.
 * @param {"restaurant"|"delivery"} partnerType
 * @param {"weekly"|"bi-weekly"|"monthly"} cycleType
 */
export async function processPayouts(partnerType, cycleType) {
  const headers = await createAuthHeaders();
  return apiFetch('/api/admin/payouts/process', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      partner_type: partnerType,
      cycle_type: cycleType,
    }),
    // cookies não são necessários para Bearer; mas manter não atrapalha
    credentials: 'include',
  });
}
