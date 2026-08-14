import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/ui';
import Button from '../../components/Button';

export default function AdminProviders() {
  const { toast } = useToast();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get('/admin/providers')
      .then((res) => setProviders(res.data.providers || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const update = async (id, payload) => {
    await api.patch(`/admin/providers/${id}`, payload);
    toast('Provider updated');
    await load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this provider permanently?')) return;
    await api.delete(`/admin/providers/${id}`);
    toast('Provider deleted', 'info');
    await load();
  };

  const approved = providers.filter((p) => p.status === 'approved').length;
  const pending = providers.filter((p) => p.status === 'pending').length;

  if (loading) return <p className="text-ink-soft">Loading providers…</p>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-2xl p-4">
          <p className="text-sm text-ink-soft">Total</p>
          <p className="font-display text-2xl font-bold">{providers.length}</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-sm text-ink-soft">Approved</p>
          <p className="font-display text-2xl font-bold">{approved}</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-sm text-ink-soft">Pending</p>
          <p className="font-display text-2xl font-bold">{pending}</p>
        </div>
      </div>

      <div className="space-y-3">
        {!providers.length && (
          <p className="text-sm text-ink-soft">No providers registered yet.</p>
        )}
        {providers.map((provider) => (
          <div key={provider._id} className="surface rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{provider.businessName}</p>
                <p className="text-sm text-ink-soft">
                  {provider.category?.name} · {provider.city} · {provider.owner?.email}
                </p>
              </div>
              <StatusBadge status={provider.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {provider.status !== 'approved' && (
                <Button
                  className="!py-2 !text-sm"
                  onClick={() => update(provider._id, { status: 'approved', verified: true })}
                >
                  Approve
                </Button>
              )}
              {provider.status !== 'rejected' && (
                <Button
                  variant="secondary"
                  className="!py-2 !text-sm"
                  onClick={() => update(provider._id, { status: 'rejected' })}
                >
                  Reject
                </Button>
              )}
              <Button
                variant="ghost"
                className="!py-2 !text-sm"
                onClick={() => update(provider._id, { verified: !provider.verified })}
              >
                {provider.verified ? 'Unverify' : 'Verify'}
              </Button>
              <Button
                variant="secondary"
                className="!py-2 !text-sm"
                onClick={() => remove(provider._id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
