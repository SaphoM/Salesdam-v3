import api from '../api';

export const deleteTenant = async (tenantId) => {
  try {
    const res = await api.delete(`/admin/tenants/${tenantId}`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to delete tenant.');
  }
};

export const permanentlyDeleteTenant = async (tenantId) => {
  try {
    const res = await api.delete(`/admin/tenants/${tenantId}/permanently`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to permanently delete tenant.');
  }
};

export const getTenants = async (params) => {
  try {
    const res = await api.get('/admin/tenants', { params });
    return res.data.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch tenants.');
  }
};

export const getTenant = async (tenantId) => {
  try {
    const res = await api.get(`/admin/tenants/${tenantId}`);
    return res.data.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch tenant.');
  }
};

export const updateTenant = async (tenantId, data) => {
  try {
    const res = await api.put(`/admin/tenants/${tenantId}`, data);
    return res.data.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to update tenant.');
  }
};
