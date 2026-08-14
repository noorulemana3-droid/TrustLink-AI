import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { myRequests, cancelRequest } from '../services/requests';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, StatusBadge } from '../components/ui';
import Button from '../components/Button';
import { formatPkr } from '../utils/money';
import { paymentMethodLabel } from '../utils/payments';

const TABS = ['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'];

export default function RequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await myRequests();
      setRequests(data.requests || []);
    } catch {
      toast('Could not load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const filtered = useMemo(() => {
    if (tab === 'all') return requests;
    return requests.filter((r) => r.status === tab);
  }, [requests, tab]);

  const cancel = async (id) => {
    try {
      await cancelRequest(id);
      toast('Request cancelled');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Cancel failed', 'error');
    }
  };

  if (!user) {
    return (
      <div className="page-shell py-16">
        <EmptyState title="Login required" text="Sign in to track your service requests." />
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">Requests</p>
          <h1 className="font-display mt-2 text-4xl font-extrabold">My service requests</h1>
        </div>
        <Link to="/providers">
          <Button variant="secondary">Find providers</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${
              tab === t ? 'bg-ink text-sand' : 'bg-white text-ink-soft border border-line'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-soft">Loading requests...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="You don't have any service requests yet."
          text="Send a request from any provider profile to get started."
        >
          <Link to="/providers">
            <Button>Explore Providers</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req._id} className="surface rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/requests/${req._id}`}
                    className="font-display text-lg font-bold hover:text-sea"
                  >
                    {req.provider?.businessName || 'Provider'}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">
                    {req.service || 'Service'} · Budget {formatPkr(req.budget)}
                    {req.paymentMethod ? ` · ${paymentMethodLabel(req.paymentMethod)}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {new Date(req.createdAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <p className="mt-3 text-sm text-ink-soft line-clamp-2">{req.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/requests/${req._id}`}>
                  <Button variant="secondary" className="!py-2 !text-sm">
                    View Details
                  </Button>
                </Link>
                {req.status === 'pending' && (
                  <Button
                    variant="ghost"
                    className="!py-2 !text-sm"
                    onClick={() => cancel(req._id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
