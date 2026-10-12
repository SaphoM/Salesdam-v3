import api from '../api';

export const login = (email, password, tenantId) =>
  api.post('/auth/login', { email, password, tenantId });

export const register = (data) =>
  api.post('/auth/register', data);

export const logout = () =>
  api.post('/auth/logout');

export const getMe = () =>
  api.get('/auth/me');

export const switchTenant = (tenantId) =>
  api.post('/auth/switch-tenant', { tenantId });

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });
