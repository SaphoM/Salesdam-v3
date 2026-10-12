import api from '../api';

export const getDashboards = async (params) => {
  try {
    const res = await api.get('/dashboards', { params });
    return res.data.data || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to fetch dashboards.',
    );
  }
};

export const getDashboardById = async (id) => {
  try {
    const res = await api.get(`/dashboards/${id}`);
    return res.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to fetch dashboard.',
    );
  }
};
