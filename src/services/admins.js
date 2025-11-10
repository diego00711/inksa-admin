import { request } from './api';

export function listAdmins(params = {}) {
  return request('/api/admin/admins', { params });
}

export function createAdmin(adminData) {
  return request('/api/admin/admins', {
    method: 'POST',
    body: adminData,
  });
}

export function updateAdmin(adminId, updates) {
  return request(`/api/admin/admins/${adminId}`, {
    method: 'PUT',
    body: updates,
  });
}

export function deleteAdmin(adminId) {
  return request(`/api/admin/admins/${adminId}`, {
    method: 'DELETE',
  });
}

const adminsService = {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};

export default adminsService;
