import api from '../../services/api';

/**
 * Verify a Paystack transaction and activate account
 */
export const verifyTransaction = async (reference) => {
  const response = await api.post('/registration/verify-payment', { reference });
  return response.data;
};

/**
 * Get public billing plans
 */
export const getPublicPlans = async () => {
  const response = await api.get('/billing/public-plans');
  return response.data.data;
};

/**
 * Get admin billing plans from Paystack
 */
export const getAdminPlans = async () => {
  const response = await api.get('/billing/admin/plans');
  return response.data.data;
};

/**
 * Get current subscription details
 */
export const getSubscription = async () => {
  const response = await api.get('/admin/subscription');
  return response.data.data;
};

/**
 * Get payment details from Paystack
 */
export const getPaymentDetails = async () => {
  const response = await api.get('/billing/admin/payment-details');
  return response.data.data;
};

/**
 * Get invoices from Paystack
 */
export const getInvoices = async (page = 1, limit = 50) => {
  const response = await api.get('/billing/admin/invoices', { params: { page, limit } });
  return response.data;
};

/**
 * Update subscription plan
 */
export const updateSubscriptionPlan = async (newPlan, planCode) => {
  const response = await api.put('/admin/subscription/plan', { newPlan, planCode });
  return response.data;
};

/**
 * Get Paystack URL to update payment method
 */
export const getUpdatePaymentUrl = async () => {
  const response = await api.post('/billing/admin/update-payment-url');
  return response.data.data;
};

/**
 * Update payment method (deprecated - use Paystack hosted page instead)
 */
export const updatePaymentMethod = async (authorizationCode, token) => {
  const response = await api.put('/admin/subscription/payment-method', {
    authorizationCode,
    token,
  });
  return response.data;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (cancellationReason) => {
  const response = await api.post('/admin/subscription/cancel', { cancellationReason });
  return response.data;
};
