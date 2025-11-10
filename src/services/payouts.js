import { request } from './api';

export function listPayouts(params = {}) {
  return request('/api/admin/payouts', { params });
}

export function getPayout(id) {
  return request(`/api/admin/payouts/${id}`);
}

export function processPayouts({ partner_type, cycle_type = 'weekly' }) {
  return request('/api/admin/payouts/process', {
    method: 'POST',
    body: { partner_type, cycle_type },
  });
}

export function markPayoutPaid(id, { payment_method, payment_ref, paid_at } = {}) {
  return request(`/api/admin/payouts/${id}/mark-paid`, {
    method: 'POST',
    body: { payment_method, payment_ref, paid_at },
  });
}

export function cancelPayout(id) {
  return request(`/api/admin/payouts/${id}/cancel`, {
    method: 'POST',
  });
}
