import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acceptRequest,
  completeRequest,
  providerRequests,
  rejectRequest,
} from '../../services/requests';
import { EmptyState, StatusBadge } from '../../components/ui';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { formatPkr } from '../../utils/money';
import { paymentMethodLabel } from '../../utils/payments';

export default function ProviderRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await providerRequests();
      setRequests(data.requests || []);
    } catch {
      toast('Could not load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn, id, msg, payload) => {
    try {
      await fn(id, payload);
      toast(msg);
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  if (loading) return <p className="text-ink-soft">Loading requests...</p>;

  if (!requests.length) {
    return (
      <EmptyState
        title="You don't have any service requests yet."
        text="Customers will appear here after they send you a request."
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req._id} className="surface rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-lg font-bold">{req.customer?.name}</p>
              <p className="text-sm text-ink-soft">
                {req.customerPhone || req.customer?.phone} · {req.location || req.customer?.city}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={req.status} />
              {req.paymentStatus && req.paymentStatus !== 'unpaid' && (
                <StatusBadge status={req.paymentStatus} />
              )}
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold">{req.service || 'Service request'}</p>
          <p className="mt-1 text-sm text-ink-soft">{req.description}</p>
          <p className="mt-2 text-xs text-ink-soft">
            Budget {formatPkr(req.budget)}
            {req.paymentMethod ? ` · ${paymentMethodLabel(req.paymentMethod)}` : ''}
            {req.preferredDate ? ` · ${new Date(req.preferredDate).toLocaleDateString()}` : ''}
            {req.preferredTime ? ` · ${req.preferredTime}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/requests/${req._id}`}>
              <Button variant="secondary" className="!py-2 !text-sm">
                View Details
              </Button>
            </Link>
            {req.status === 'pending' && (
              <>
                <Button
                  className="!py-2 !text-sm"
                  onClick={() => run(acceptRequest, req._id, 'Request accepted')}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  className="!py-2 !text-sm"
                  onClick={() => run(rejectRequest, req._id, 'Request rejected')}
                >
                  Reject
                </Button>
              </>
            )}
            {req.status === 'accepted' && (
              <Button
                className="!py-2 !text-sm"
                onClick={() => run(completeRequest, req._id, 'Marked completed')}
              >
                Mark Completed
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
