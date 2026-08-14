import api from './api';

export const createRequest = (payload) =>
  api.post('/requests', payload).then((r) => r.data);

export const myRequests = (params) =>
  api.get('/requests/my', { params }).then((r) => r.data);

export const providerRequests = (params) =>
  api.get('/requests/provider', { params }).then((r) => r.data);

export const getRequest = (id) =>
  api.get(`/requests/${id}`).then((r) => r.data);

export const cancelRequest = (id) =>
  api.put(`/requests/${id}/cancel`).then((r) => r.data);

export const acceptRequest = (id, payload = {}) =>
  api.put(`/requests/${id}/accept`, payload).then((r) => r.data);

export const rejectRequest = (id, payload = {}) =>
  api.put(`/requests/${id}/reject`, payload).then((r) => r.data);

export const completeRequest = (id, payload = {}) =>
  api.put(`/requests/${id}/complete`, payload).then((r) => r.data);

export const payRequest = (id, payload = {}) =>
  api.post(`/requests/${id}/pay`, payload).then((r) => r.data);

export const listAllRequests = (params) =>
  api.get('/requests', { params }).then((r) => r.data);
