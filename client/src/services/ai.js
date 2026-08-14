import api from './api';

export const recommendProviders = (query) =>
  api.post('/ai/recommend', { query }, { timeout: 45000 }).then((r) => r.data);

export const parseAiQuery = (query) =>
  api.post('/ai/parse', { query }).then((r) => r.data);

export const getReviewSummary = (providerId) =>
  api.get(`/ai/reviews/${providerId}/summary`).then((r) => r.data);
