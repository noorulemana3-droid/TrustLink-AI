import api from './api';

export const listProviderReviews = (providerId) =>
  api.get(`/reviews/provider/${providerId}`).then((r) => r.data);

export const getMyReview = (providerId) =>
  api.get(`/reviews/mine/provider/${providerId}`).then((r) => r.data);

export const createReview = (payload) =>
  api.post('/reviews', payload).then((r) => r.data);

export const updateReview = (id, payload) =>
  api.put(`/reviews/${id}`, payload).then((r) => r.data);

export const deleteReview = (id) =>
  api.delete(`/reviews/${id}`).then((r) => r.data);

export const reportReview = (id, reason) =>
  api.post(`/reviews/${id}/report`, { reason }).then((r) => r.data);
