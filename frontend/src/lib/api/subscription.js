import api from '../../services/api';

/**
 * Get current subscription details
 */
export const getCurrentSubscription = async () => {
  const response = await api.get('/subscription/current');
  return response.data;
};

/**
 * Get cancellation information
 */
export const getCancellationInfo = async () => {
  const response = await api.get('/subscription/cancellation-info');
  return response.data;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (reason = '') => {
  const response = await api.post('/subscription/cancel', { reason });
  return response.data;
};

/**
 * Reactivate cancelled subscription
 */
export const reactivateSubscription = async () => {
  const response = await api.post('/subscription/reactivate');
  return response.data;
};
