import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui';
import Button from '../../components/Button';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/requests/my'), api.get('/favorites')])
      .then(([r, f]) => {
        setRequests(r.data.requests || []);
        setFavorites(f.data.favorites || []);
      })
      .catch(() => {
        setRequests([]);
        setFavorites([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const by = (status) => requests.filter((r) => r.status === status).length;
    return {
      total: requests.length,
      pending: by('pending'),
      accepted: by('accepted'),
      completed: by('completed'),
      favorites: favorites.length,
    };
  }, [requests, favorites]);

  return (
    <div className="space-y-6">
      <div className="surface rounded-3xl p-6">
        <h2 className="font-display text-2xl font-bold">Hello, {user?.name?.split(' ')[0]}</h2>
        <p className="mt-2 text-ink-soft">
          Track requests, manage favorites, and update your profile.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/providers" className="btn btn-primary">
            Find providers
          </Link>
          <Link to="/ai" className="btn btn-secondary">
            Ask AI
          </Link>
          <Link to="/requests" className="btn btn-ghost">
            My requests
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Total Requests', stats.total],
          ['Pending', stats.pending],
          ['Accepted', stats.accepted],
          ['Completed', stats.completed],
          ['Favorites', stats.favorites],
        ].map(([label, value]) => (
          <div key={label} className="surface rounded-2xl p-4">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {loading ? '—' : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold">Recent requests</h3>
            <Link to="/requests" className="text-sm font-bold text-sea">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {loading && <p className="text-sm text-ink-soft">Loading requests...</p>}
            {!loading && requests.length === 0 && (
              <p className="text-sm text-ink-soft">You don&apos;t have any service requests yet.</p>
            )}
            {requests.slice(0, 5).map((req) => (
              <Link
                key={req._id}
                to={`/requests/${req._id}`}
                className="block rounded-2xl border border-line/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{req.provider?.businessName}</p>
                  <StatusBadge status={req.status} />
                </div>
                <p className="mt-1 text-sm text-ink-soft line-clamp-2">
                  {req.service || req.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="surface rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold">Favorites</h3>
            <Link to="/favorites" className="text-sm font-bold text-sea">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {loading && <p className="text-sm text-ink-soft">Loading favorites...</p>}
            {!loading && favorites.length === 0 && (
              <p className="text-sm text-ink-soft">No favorite providers yet.</p>
            )}
            {favorites.slice(0, 4).map((fav) => (
              <Link
                key={fav._id}
                to={`/providers/${fav._id}`}
                className="block rounded-2xl border border-line/70 p-3"
              >
                <p className="font-semibold">{fav.businessName}</p>
                <p className="text-sm text-ink-soft">
                  {fav.city} · {fav.category?.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
