import api from '../../services/api';

/**
 * Create a recurring task series
 */
export const createRecurringTasks = async (taskData) => {
  const response = await api.post('/recurring-tasks', taskData);
  return response.data.data;
};

/**
 * Get all tasks in a recurring series
 */
export const getRecurringSeriesTasks = async (seriesId) => {
  const response = await api.get(`/recurring-tasks/${seriesId}`);
  return response.data.data;
};

/**
 * Update all tasks in a recurring series
 */
export const updateRecurringSeries = async (seriesId, updates) => {
  const response = await api.put(`/recurring-tasks/${seriesId}`, updates);
  return response.data.data;
};

/**
 * Delete all tasks in a recurring series
 */
export const deleteRecurringSeries = async (seriesId) => {
  const response = await api.delete(`/recurring-tasks/${seriesId}`);
  return response.data;
};
