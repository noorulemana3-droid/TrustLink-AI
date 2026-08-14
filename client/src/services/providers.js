import api from './api';

export const listProviders = (params) =>
  api.get('/providers', { params }).then((r) => r.data);

export const getProvider = (id) =>
  api.get(`/providers/${id}`).then((r) => r.data);

export const getMyProvider = () =>
  api.get('/providers/me/profile').then((r) => r.data);

export const createProvider = (payload, isFormData = false) =>
  api
    .post('/providers', payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    })
    .then((r) => r.data);

export const updateMyProvider = (payload, isFormData = false) =>
  api
    .put('/providers/me', payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    })
    .then((r) => r.data);

export const setMyAvailability = (available) =>
  updateMyProvider({ available: Boolean(available) });

export const deleteMyProvider = () =>
  api.delete('/providers/me').then((r) => r.data);

export const deleteProvider = (id) =>
  api.delete(`/providers/${id}`).then((r) => r.data);
