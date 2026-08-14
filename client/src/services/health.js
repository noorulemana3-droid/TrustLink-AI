import api from './api';

/** Check API + Mongo readiness. Returns { ok, status, db, message }. */
export const checkApiHealth = async () => {
  try {
    const { data } = await api.get('/health', { timeout: 8000 });
    const ok = data?.status === 'ok' && data?.db === 'connected';
    return {
      ok,
      status: data?.status || 'unknown',
      db: data?.db || 'unknown',
      message: ok
        ? 'API connected'
        : 'Database is disconnected. Start MongoDB or check MONGODB_URI.',
    };
  } catch {
    return {
      ok: false,
      status: 'offline',
      db: 'unknown',
      message:
        'Cannot reach the API. Start the server (port 5000) and ensure MongoDB is running.',
    };
  }
};
