import api from '../api';

export const getIncidents = (params) => api.get('/incidents', { params });

export const getIncident = (id) => api.get(`/incidents/${id}`);

export const createIncident = (data) => api.post('/incidents', data);

export const updateIncident = (id, data) => api.patch(`/incidents/${id}`, data);

export const upvoteIncident = (id) => api.post(`/incidents/${id}/upvote`);

export const addComment = (id, data) => api.post(`/incidents/${id}/comments`, data);

export const deleteComment = (id, commentId) =>
  api.delete(`/incidents/${id}/comments/${commentId}`);

export const addReply = (id, commentId, data) =>
  api.post(`/incidents/${id}/comments/${commentId}/replies`, data);

export const deleteReply = (id, commentId, replyId) =>
  api.delete(`/incidents/${id}/comments/${commentId}/replies/${replyId}`);

export const editIncident = (id, data) =>
  api.patch(`/incidents/${id}/edit`, data);

export const closeIncident = (id) =>
  api.patch(`/incidents/${id}/close`);
