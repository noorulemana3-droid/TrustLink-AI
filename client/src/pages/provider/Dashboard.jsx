import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { setMyAvailability } from '../../services/providers';
import {
  acceptRequest,
  rejectRequest,
} from '../../services/requests';
import { StatusBadge } from '../../components/ui';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { formatPkr } from '../../utils/money';
import { formatWorkingHours } from '../../utils/time';
import { paymentMethodLabel } from '../../utils/payments';

export default function ProviderDashboard() {
  const { toast } = useToast();
  const [provider, setProvider] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    const [p, r, rev] = await Promise.all([
      api.get('/providers/me/profile').catch(() => ({ data: { provider: null } })),
      api.get('/requests/provider'),
      api.get('/reviews/mine/provider'),
    ]);
    setProvider(p.data.provider);
    setRequests(r.data.requests || []);
    setReviews((rev.data.reviews || []).slice(0, 4));
  };

  useEffect(() => {
    load()
      .catch(() => toast('Could not load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending');
    const accepted = requests.filter((r) => r.status === 'accepted');
    const completed = requests.filter((r) => r.status === 'completed');
    return {
      pending,
      accepted,
      completed,
      pendingCount: pending.length,
      acceptedCount: accepted.length,
      completedCount: completed.length,
      total: requests.length,
    };
  }, [requests]);

  const toggleAvailability = async () => {
    if (!provider) return;
    setToggling(true);
    const next = !provider.available;
    try {
      const data = await setMyAvailability(next);
      setProvider(data.provider);
      toast(next ? 'You are now available for bookings' : 'Marked unavailable');
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update availability', 'error');
    } finally {
      setToggling(false);
    }
  };

  const runRequest = async (fn, id, msg) => {
    try {
      await fn(id);
      toast(msg);
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  if (loading) {
    return <p className="text-ink-soft">Loading your workspace…</p>;
  }

  if (!provider) {
    return (
      <div className="surface rounded-3xl p-6">
        <h2 className="font-display text-2xl font-bold">Create your provider profile</h2>
        <p className="mt-2 text-ink-soft">
          Publish your services to start receiving customer requests.
        </p>
        <Link to="/dashboard/provider/profile" className="btn btn-primary mt-4 inline-flex">
          Set up profile
        </Link>
      </div>
    );
  }

  const shortcuts = [
    {
      to: '/dashboard/provider/requests',
      label: 'Requests',
      detail:
        stats.pendingCount > 0
          ? `${stats.pendingCount} waiting`
          : `${stats.total} total`,
      accent: stats.pendingCount > 0,
    },
    {
      to: '/dashboard/provider/profile',
      label: 'Profile & hours',
      detail: formatWorkingHours(provider.workingHours?.from, provider.workingHours?.to),
    },
    {
      to: '/dashboard/provider/reviews',
      label: 'Reviews',
      detail: `${provider.ratingAvg?.toFixed?.(1) || provider.ratingAvg || '0.0'}★ · ${
        provider.ratingCount || 0
      }`,
    },
    ...(provider.status === 'approved'
      ? [
          {
            to: `/providers/${provider._id}`,
            label: 'Public profile',
            detail: 'See what customers see',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="surface rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold">{provider.businessName}</h2>
              <StatusBadge status={provider.status} />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {provider.category?.name || 'Service'} · {provider.area || provider.city}
              {provider.responseRate > 0 ? ` · ${provider.responseRate}% response rate` : ''}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Hours: {formatWorkingHours(provider.workingHours?.from, provider.workingHours?.to)}
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto">
            <button
              type="button"
              disabled={toggling || provider.status !== 'approved'}
              onClick={toggleAvailability}
              className={`flex min-h-12 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                provider.available
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-950'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span>
                <span className="block text-sm font-bold">
                  {provider.available ? 'Available for bookings' : 'Currently unavailable'}
                </span>
                <span className="mt-0.5 block text-xs opacity-80">
                  {provider.status !== 'approved'
                    ? 'Approve profile first'
                    : toggling
                      ? 'Updating…'
                      : 'Tap to toggle'}
                </span>
              </span>
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  provider.available ? 'bg-emerald-600' : 'bg-amber-500/70'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    provider.available ? 'left-5' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
            <Link
              to="/dashboard/provider/profile"
              className="text-center text-sm font-bold text-sea"
            >
              Edit hours & profile →
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Pending', value: stats.pendingCount, highlight: stats.pendingCount > 0 },
            { label: 'In progress', value: stats.acceptedCount },
            { label: 'Completed', value: stats.completedCount },
            {
              label: 'Rating',
              value: `${provider.ratingAvg?.toFixed?.(1) || '0.0'}★`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-3 ${
                item.highlight
                  ? 'border-sea/40 bg-sea/5'
                  : 'border-line/70 bg-white/60'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {item.label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">Shortcuts</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              className={`surface rounded-2xl p-4 transition hover:border-sea ${
                item.accent ? 'ring-1 ring-sea/30' : ''
              }`}
            >
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-sm text-ink-soft line-clamp-2">{item.detail}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-display text-xl font-bold">
              Needs attention
              {stats.pendingCount > 0 ? (
                <span className="ml-2 rounded-full bg-sea px-2 py-0.5 text-xs font-bold text-white">
                  {stats.pendingCount}
                </span>
              ) : null}
            </h3>
            <Link to="/dashboard/provider/requests" className="text-sm font-bold text-sea">
              All requests
            </Link>
          </div>

          {stats.pending.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No pending requests. Accepted jobs appear under Requests.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.pending.slice(0, 4).map((req) => (
                <div
                  key={req._id}
                  className="rounded-2xl border border-sea/25 bg-sea/[0.03] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{req.customer?.name}</p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-soft line-clamp-2">{req.description}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatPkr(req.budget)}
                    {req.paymentMethod ? ` · ${paymentMethodLabel(req.paymentMethod)}` : ''}
                    {req.preferredTime ? ` · ${req.preferredTime}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="!min-h-10 !py-2 !text-sm"
                      onClick={() => runRequest(acceptRequest, req._id, 'Request accepted')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      className="!min-h-10 !py-2 !text-sm"
                      onClick={() => runRequest(rejectRequest, req._id, 'Request rejected')}
                    >
                      Reject
                    </Button>
                    <Link to={`/requests/${req._id}`}>
                      <Button variant="ghost" className="!min-h-10 !py-2 !text-sm">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {stats.acceptedCount > 0 && (
            <p className="mt-4 text-sm text-ink-soft">
              {stats.acceptedCount} job{stats.acceptedCount === 1 ? '' : 's'} in progress —{' '}
              <Link to="/dashboard/provider/requests" className="font-bold text-sea">
                mark complete when done
              </Link>
            </p>
          )}
        </div>

        <div className="surface rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold">Recent reviews</h3>
            <Link to="/dashboard/provider/reviews" className="text-sm font-bold text-sea">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {reviews.length === 0 && (
              <p className="text-sm text-ink-soft">No reviews yet.</p>
            )}
            {reviews.map((review) => (
              <div key={review._id} className="rounded-2xl border border-line/70 p-3">
                <p className="font-semibold">
                  {review.user?.name} · {review.rating}/5
                </p>
                <p className="mt-1 text-sm text-ink-soft line-clamp-3">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
