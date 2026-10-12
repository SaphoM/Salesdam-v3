import api from '../api';

export const getExternalObjects = async (params) => {
  try {
    const res = await api.get('/external-objects', { params });
    return res.data.data || [];
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch objects.');
  }
};

export const deleteExternalObject = async (id) => {
  try {
    await api.delete(`/external-objects/${id}`);
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to delete object.');
  }
};
