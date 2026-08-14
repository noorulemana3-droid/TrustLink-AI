import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  acceptRequest,
  cancelRequest,
  completeRequest,
  getRequest,
  rejectRequest,
} from '../services/requests';
import { EmptyState, StatusBadge } from '../components/ui';
import Button from '../components/Button';
import { formatPkr } from '../utils/money';
import { paymentMethodLabel } from '../utils/payments';

export default function RequestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRequest(id);
      setRequest(data.request);
    } catch {
      setRequest(null);
      toast('Request not found or access denied', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const run = async (action, successMsg, payload) => {
    try {
      const data = await action(id, payload);
      setRequest(data.request);
      toast(successMsg);
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  if (loading) {
    return <div className="page-shell py-16 text-ink-soft">Loading request...</div>;
  }

  if (!request) {
    return (
      <div className="page-shell py-16">
        <EmptyState title="Request not found" text="This request may have been removed." />
      </div>
    );
  }

  const isCustomer =
    user &&
    String(request.customer?._id || request.customer) === String(user.id || user._id);
  const isProvider =
    user?.role === 'provider' ||
    (request.provider?.owner &&
      String(request.provider.owner._id || request.provider.owner) ===
        String(user?.id || user?._id));

  return (
    <div className="page-shell py-10">
      <Link
        to={isProvider ? '/dashboard/provider/requests' : '/requests'}
        className="text-sm font-bold text-sea"
      >
        ← Back to requests
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">
            {request.provider?.businessName || 'Service request'}
          </h1>
          <p className="mt-2 text-ink-soft">{request.service || 'Service request'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="surface rounded-3xl p-5">
          <h2 className="font-display text-xl font-bold">Request details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-ink-soft">Description</dt>
              <dd className="mt-1 font-semibold">{request.description}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Budget</dt>
              <dd className="mt-1 font-semibold">{formatPkr(request.budget)}</dd>
            </div>
            {request.paymentMethod ? (
              <div>
                <dt className="text-ink-soft">Preferred payment</dt>
                <dd className="mt-1 font-semibold">
                  {paymentMethodLabel(request.paymentMethod)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-ink-soft">Preferred date/time</dt>
              <dd className="mt-1 font-semibold">
                {request.preferredDate
                  ? new Date(request.preferredDate).toLocaleDateString()
                  : '—'}
                {request.preferredTime ? ` · ${request.preferredTime}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Location</dt>
              <dd className="mt-1 font-semibold">{request.location || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Phone</dt>
              <dd className="mt-1 font-semibold">{request.customerPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Created</dt>
              <dd className="mt-1 font-semibold">
                {new Date(request.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-5">
          <div className="surface rounded-3xl p-5">
            <h2 className="font-display text-xl font-bold">Customer</h2>
            <p className="mt-3 font-semibold">{request.customer?.name}</p>
            <p className="text-sm text-ink-soft">{request.customer?.email}</p>
            <p className="text-sm text-ink-soft">
              {request.customerPhone || request.customer?.phone || '—'}
            </p>
          </div>

          <div className="surface rounded-3xl p-5">
            <h2 className="font-display text-xl font-bold">Provider</h2>
            <Link
              to={`/providers/${request.provider?._id}`}
              className="mt-3 block font-semibold text-sea"
            >
              {request.provider?.businessName}
            </Link>
            <p className="text-sm text-ink-soft">{request.provider?.city}</p>
            {(request.providerMessage || request.providerNote) && (
              <p className="mt-3 rounded-xl bg-mist/60 p-3 text-sm">
                Provider note: {request.providerMessage || request.providerNote}
              </p>
            )}
          </div>

          <div className="surface space-y-2 rounded-3xl p-5">
            {isCustomer && request.status === 'pending' && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => run(cancelRequest, 'Request cancelled')}
              >
                Cancel Request
              </Button>
            )}

            {(user?.role === 'provider' || isProvider) && request.status === 'pending' && (
              <>
                <textarea
                  className="input min-h-20"
                  placeholder="Optional message to customer"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() =>
                    run(acceptRequest, 'Request accepted', { providerMessage: message })
                  }
                >
                  Accept
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() =>
                    run(rejectRequest, 'Request rejected', { providerMessage: message })
                  }
                >
                  Reject
                </Button>
              </>
            )}

            {(user?.role === 'provider' || isProvider) && request.status === 'accepted' && (
              <Button
                className="w-full"
                onClick={() => run(completeRequest, 'Request marked completed')}
              >
                Mark Completed
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
