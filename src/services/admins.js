import { request } from './api';

export function listAdmins(params = {}) {
  return request('/api/admin/admins', { params, service: 'auth' });
}

export function createAdmin(adminData) {
  return request('/api/admin/admins', {
    method: 'POST',
    body: adminData,
    service: 'auth',
  });
}

export function updateAdmin(adminId, updates) {
  return request(`/api/admin/admins/${adminId}`, {
    method: 'PUT',
    body: updates,
    service: 'auth',
  });
}

export function deleteAdmin(adminId) {
  return request(`/api/admin/admins/${adminId}`, {
    method: 'DELETE',
    service: 'auth',
  });
}

const adminsService = {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};

export default adminsService;
