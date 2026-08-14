import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data.stats))
      .catch(() => setError('Could not load platform stats.'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    ['Users', stats?.users, '/dashboard/admin/users'],
    ['Providers', stats?.providers, '/dashboard/admin/providers'],
    ['Pending providers', stats?.pendingProviders, '/dashboard/admin/providers'],
    ['Reviews', stats?.reviews, '/dashboard/admin/reviews'],
    ['Requests', stats?.requests, '/dashboard/admin/requests'],
    ['Categories', stats?.categories, '/dashboard/admin/categories'],
  ];

  return (
    <div className="space-y-6">
      <div className="surface rounded-3xl p-6">
        <h2 className="font-display text-2xl font-bold">Platform overview</h2>
        <p className="mt-2 text-ink-soft">
          Moderate users, approve providers, manage categories, and remove fake reviews.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/dashboard/admin/providers" className="btn btn-primary">
            Review pending providers
          </Link>
          <Link to="/dashboard/admin/reviews" className="btn btn-secondary">
            Moderate reviews
          </Link>
          <Link to="/dashboard/admin/requests" className="btn btn-ghost">
            Monitor requests
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, to]) => (
          <Link key={label} to={to} className="surface rounded-2xl p-5 transition hover:border-sea">
            <p className="text-sm font-semibold text-ink-soft">{label}</p>
            <p className="font-display mt-2 text-3xl font-extrabold">
              {loading ? '—' : value ?? 0}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
