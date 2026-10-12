import api from '../api';

/**
 * Saved list views.
 *
 * The collection returned by `getListViews` is already ordered by the server:
 * config-defined defaults first (`isDefault: true`, `canEdit: false`), then the
 * user's own / shared views. Each entry has the shape
 * `{ key, name, filters, columns, sortField, sortOrder, isDefault, isShared, canEdit }`.
 */

/**
 * Normalises a rejection into an Error that still carries the HTTP status, so
 * callers can stay quiet about the statuses the axios interceptor already
 * toasts about (401 / 403 / 429 / 5xx).
 */
const toError = (err, fallback) => {
  const error = new Error(
    err?.message || err?.response?.data?.message || fallback,
  );
  error.status = err?.status ?? err?.response?.status;
  return error;
};

export const getListViews = async (objectApiName) => {
  try {
    const res = await api.get(`/list-views/${objectApiName}`);
    return res.data.data || [];
  } catch (err) {
    throw toError(err, 'Failed to load list views.');
  }
};

export const createListView = async (objectApiName, data) => {
  try {
    const res = await api.post(`/list-views/${objectApiName}`, data);
    return res.data.data;
  } catch (err) {
    throw toError(err, 'Failed to create list view.');
  }
};

export const updateListView = async (objectApiName, id, data) => {
  try {
    const res = await api.put(`/list-views/${objectApiName}/${id}`, data);
    return res.data.data;
  } catch (err) {
    throw toError(err, 'Failed to update list view.');
  }
};

export const deleteListView = async (objectApiName, id) => {
  try {
    const res = await api.delete(`/list-views/${objectApiName}/${id}`);
    return res.data;
  } catch (err) {
    throw toError(err, 'Failed to delete list view.');
  }
};
