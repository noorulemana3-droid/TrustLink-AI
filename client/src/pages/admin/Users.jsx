import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState } from '../../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data.users || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/admin/users/${id}`);
    setMessage('User deleted');
    await load();
  };

  if (loading) return <p className="text-ink-soft">Loading users…</p>;

  if (!users.length) {
    return <EmptyState title="No users" text="Registered accounts will appear here." />;
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm font-semibold text-sea">{message}</p>}
      {users.map((user) => (
        <div
          key={user._id}
          className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
        >
          <div>
            <p className="font-bold">{user.name}</p>
            <p className="text-sm text-ink-soft">
              {user.email} · {user.role} · {user.city || '—'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary !py-2 !text-sm"
            onClick={() => remove(user._id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
