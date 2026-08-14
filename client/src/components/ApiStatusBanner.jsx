import { useCallback, useEffect, useState } from 'react';
import { checkApiHealth } from '../services/health';

/**
 * Sticky banner when API or MongoDB is down — avoids looking like "empty search results".
 */
export default function ApiStatusBanner() {
  const [health, setHealth] = useState(null);

  const refresh = useCallback(() => {
    checkApiHealth().then(setHealth);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  if (!health || health.ok) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950"
    >
      <span className="font-semibold">Connection issue:</span> {health.message}{' '}
      <button
        type="button"
        onClick={refresh}
        className="font-bold underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  );
}
