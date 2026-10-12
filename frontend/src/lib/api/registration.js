import api from '../../services/api';

/**
 * Register user with free plan
 */
export const registerWithFreePlan = async (formData) => {
  const response = await api.post('/auth/register-free', {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    username: formData.username,
    password: formData.password,
    phone: formData.phone,
    companyName: formData.companyName,
    employees: formData.employees || 1,
  });

  return response.data;
};

/**
 * Register user with Paystack payment
 */
export const register = async (formData) => {
  const response = await api.post('/auth/register-paystack', {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    username: formData.username,
    password: formData.password,
    phone: formData.phone,
    companyName: formData.companyName,
    employees: formData.employees,
    planId: formData.planId,
    debitOrderDay: formData.debitOrderDay,
  });

  return response.data;
};

/**
 * Verify email with token
 */
export const verifyEmail = async ({ token }) => {
  const response = await api.post('/auth/verify-email', {
    token,
  });

  return response.data;
};

/**
 * Get verification status for an email
 */
export const getVerificationStatus = async ({ email }) => {
  const response = await api.get('/auth/verification-status', {
    params: { email },
  });

  return response.data;
};

/**
 * Get public plans
 */
export const getPublicPlans = async () => {
  const response = await api.get('/billing/public-plans');
  // Return the full response with paystackEnabled flag
  const data = response.data;
  return {
    data: Array.isArray(data) ? data : (data?.data || data?.plans || []),
    paystackEnabled: data?.paystackEnabled !== false,
  };
};
