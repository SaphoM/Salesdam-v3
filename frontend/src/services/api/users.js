import api from '../api';

export const getUsers = async (params) => {
  try {
    const res = await api.get('/users', { params });
    // Handle paginated response - extract records array
    const data = res.data.data;
    if (data && data.records && Array.isArray(data.records)) {
      return data.records;
    }
    // Fallback for non-paginated response
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch users.');
  }
};

export const getUser = async (id) => {
  try {
    const res = await api.get(`/users/${id}`);
    return res.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch user.');
  }
};

export const createUser = async (data) => {
  try {
    const res = await api.post('/users', data);
    return res.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create user.');
  }
};

export const updateUser = async (id, data) => {
  try {
    const res = await api.put(`/users/${id}`, data);
    return res.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update user.');
  }
};

export const deleteUser = async (id) => {
  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete user.');
  }
};

export const updateUserProfile = async (payload) => {
  try {
    const res = await api.patch('/users/me/profile', payload);
    return res.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to update profile.',
    );
  }
};
