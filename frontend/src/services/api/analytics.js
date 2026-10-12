import api from '../api';

export const getSalesdamHomeAnalytics = async () => {
  try {
    const res = await api.get('/analytics/salesdam-home');
    return res.data.data || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        'Failed to fetch salesdam home analytics.',
    );
  }
};
