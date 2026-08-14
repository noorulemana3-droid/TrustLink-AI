import { useCallback, useEffect, useState } from 'react';
import { checkApiHealth } from '../services/health';

/**
 * Shows a clear banner when the API or MongoDB is down,
 * so empty lists are not mistaken for “no providers”.
 */
export default function ApiHealthBanner() {
  const [health, setHealth] = useState({
    online: true,
    degraded: false,
    db: 'connected',
    message: null,
  });

  const probe = useCallback(async () => {
    const next = await checkApiHealth();
    setHealth(next);
  }, []);

  useEffect(() => {
    probe();
    const id = setInterval(probe, 20000);
    const onFocus = () => probe();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [probe]);

  if (health.online && !health.degraded) return null;

  const title = !health.online
    ? 'API disconnected'
    : 'Database disconnected';
  const detail =
    health.message ||
    (health.db !== 'connected'
      ? 'MongoDB is not connected. Start the MongoDB service or set MONGODB_URI (Atlas), then restart the API.'
      : 'The TrustLink API is unreachable. Run `npm run dev` in the server folder.');

  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 text-amber-950"
    >
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-0.5 text-amber-900/80">{detail}</p>
        </div>
        <button
          type="button"
          onClick={probe}
          className="min-h-10 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-950 transition hover:bg-amber-100"
        >
          Retry connection
        </button>
      </div>
    </div>
  );
}
