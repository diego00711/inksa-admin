import { request } from './api';

export function listSupportTickets(params = {}) {
  return request('/api/admin/support/tickets', { params });
}

export function getSupportTicket(ticketId) {
  return request(`/api/admin/support/tickets/${ticketId}`);
}

export function replyToSupportTicket(ticketId, message) {
  return request(`/api/admin/support/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: { message },
  });
}

export function updateSupportTicketStatus(ticketId, status) {
  return request(`/api/admin/support/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export default {
  listSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
};
