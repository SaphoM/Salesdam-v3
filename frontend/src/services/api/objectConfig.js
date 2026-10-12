import api from '../api';

export const getObjectConfig  = (objectApiName) => api.get(`/object-config/${objectApiName}`);
export const updateObjectConfig = (objectApiName, data) => api.put(`/object-config/${objectApiName}`, data);
