import api from '../api';

export const getAutomations = async (params) => {
  try {
    const res = await api.get('/automations', { params });
    return res.data.data || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to fetch automations.',
    );
  }
};

export const createAutomation = async (automationData) => {
  try {
    const res = await api.post('/automations', automationData);
    return res.data.data || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to create automation.',
    );
  }
};
