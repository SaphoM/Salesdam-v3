import api from '../../services/api';

/**
 * List all integrations for the current tenant
 */
export const listIntegrations = async (filters = {}) => {
  const response = await api.get('/integrations', { params: filters });
  return response.data.data;
};

/**
 * Create a new integration
 */
export const createIntegration = async (data) => {
  const response = await api.post('/integrations', data);
  return response.data.data;
};

/**
 * Get a single integration by ID
 */
export const getIntegration = async (integrationId) => {
  const response = await api.get(`/integrations/${integrationId}`);
  return response.data.data;
};

/**
 * Update an integration
 */
export const updateIntegration = async (integrationId, data) => {
  const response = await api.put(`/integrations/${integrationId}`, data);
  return response.data.data;
};

/**
 * Regenerate access token for an integration
 */
export const regenerateToken = async (integrationId) => {
  const response = await api.post(`/integrations/${integrationId}/regenerate-token`);
  return response.data.data;
};

/**
 * Delete an integration
 */
export const deleteIntegration = async (integrationId) => {
  const response = await api.delete(`/integrations/${integrationId}`);
  return response.data;
};

/**
 * Verify a token (called by external systems)
 */
export const verifyToken = async (token) => {
  const response = await api.post(
    '/integrations/verify-token',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data.data;
};
