import { request } from './api';

export function listPayouts(params = {}) {
  return request('/api/admin/payouts', { params, service: 'payouts' });
}

export function getPayout(id) {
  return request(`/api/admin/payouts/${id}`, { service: 'payouts' });
}

export function processPayouts({ partner_type, cycle_type = 'weekly' }) {
  return request('/api/admin/payouts/process', {
    method: 'POST',
    body: { partner_type, cycle_type },
    service: 'payouts',
  });
}

export function markPayoutPaid(id, { payment_method, payment_ref, paid_at } = {}) {
  return request(`/api/admin/payouts/${id}/mark-paid`, {
    method: 'POST',
    body: { payment_method, payment_ref, paid_at },
    service: 'payouts',
  });
}

export function cancelPayout(id) {
  return request(`/api/admin/payouts/${id}/cancel`, {
    method: 'POST',
    service: 'payouts',
  });
}
