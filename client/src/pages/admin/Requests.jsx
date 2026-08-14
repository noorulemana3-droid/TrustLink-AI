import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllRequests } from '../../services/requests';
import { EmptyState, StatusBadge } from '../../components/ui';
import { paymentMethodLabel } from '../../utils/payments';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllRequests()
      .then((data) => setRequests(data.requests || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-ink-soft">Loading...</p>;
  if (!requests.length) {
    return <EmptyState title="No requests" text="Service requests will appear here." />;
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req._id} className="surface rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link to={`/requests/${req._id}`} className="font-display text-lg font-bold">
                {req.provider?.businessName}
              </Link>
              <p className="text-sm text-ink-soft">
                {req.customer?.name} · {req.service || 'Service'}
                {req.paymentMethod ? ` · ${paymentMethodLabel(req.paymentMethod)}` : ''}
              </p>
            </div>
            <StatusBadge status={req.status} />
          </div>
          <p className="mt-2 text-sm text-ink-soft line-clamp-2">{req.description}</p>
        </div>
      ))}
    </div>
  );
}
