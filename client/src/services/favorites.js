import api from './api';

export const listFavorites = () =>
  api.get('/favorites').then((r) => r.data);

export const checkFavorite = (providerId) =>
  api.get(`/favorites/check/${providerId}`).then((r) => r.data);

export const addFavorite = (providerId) =>
  api.post(`/favorites/${providerId}`).then((r) => r.data);

export const removeFavorite = (providerId) =>
  api.delete(`/favorites/${providerId}`).then((r) => r.data);

export const toggleFavorite = (providerId) =>
  api.post('/favorites/toggle', { providerId }).then((r) => r.data);
