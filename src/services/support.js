import { request } from './api';

export function listSupportTickets(params = {}) {
  return request('/api/admin/support/tickets', {
    params,
    service: 'support',
  });
}

export function getSupportTicket(ticketId) {
  return request(`/api/admin/support/tickets/${ticketId}`, { service: 'support' });
}

export function replyToSupportTicket(ticketId, message) {
  return request(`/api/admin/support/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: { message },
    service: 'support',
  });
}

export function updateSupportTicketStatus(ticketId, status) {
  return request(`/api/admin/support/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: { status },
    service: 'support',
  });
}

export default {
  listSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
};
