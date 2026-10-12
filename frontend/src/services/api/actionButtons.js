import api from '../api';

export const createActionButton = async (objectApiName, buttonData) => {
  try {
    const res = await api.post(`/action-buttons/${objectApiName}`, buttonData);
    return res.data.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || 'Failed to create action button.',
    );
  }
};

export const getActionButtons = async (objectApiName) => {
  try {
    const res = await api.get(`/action-buttons/${objectApiName}`);
    return res.data.data || [];
  } catch (err) {
    throw new Error(
      err.response?.data?.message || 'Failed to fetch action buttons.',
    );
  }
};

export const updateActionButton = async (
  objectApiName,
  actionId,
  buttonData,
) => {
  try {
    const res = await api.put(
      `/action-buttons/${objectApiName}/${actionId}`,
      buttonData,
    );
    return res.data.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || 'Failed to update action button.',
    );
  }
};

export const deleteActionButton = async (objectApiName, actionId) => {
  try {
    await api.delete(`/action-buttons/${objectApiName}/${actionId}`);
  } catch (err) {
    throw new Error(
      err.response?.data?.message || 'Failed to delete action button.',
    );
  }
};
