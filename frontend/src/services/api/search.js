import api from '../api';

export const globalSearch = (q, params) =>
  api.get('/search', { params: { q, ...params } });

export const autocomplete = (q, objectApiName) =>
  api.get('/search/autocomplete', { params: { q, objectApiName } });
