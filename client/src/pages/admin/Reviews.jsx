import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, StarRating } from '../../components/ui';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all'); // all | reported
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'reported' ? { reported: true } : {};
      const res = await api.get('/admin/reviews', { params });
      setReviews(res.data.reviews || []);
    } catch {
      toast('Could not load reviews', 'error');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const remove = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      toast('Review removed');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const clearReports = async (id) => {
    try {
      await api.patch(`/admin/reviews/${id}/clear-reports`);
      toast('Reports cleared');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not clear reports', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'All reviews'],
          ['reported', 'Reported only'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              filter === key
                ? 'bg-ink text-[#f3f7f6]'
                : 'bg-white text-ink-soft hover:bg-mist/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink-soft">Loading reviews…</p>}

      {!loading && !reviews.length && (
        <EmptyState
          title={filter === 'reported' ? 'No reported reviews' : 'No reviews'}
          text={
            filter === 'reported'
              ? 'Reported reviews will appear here for moderation.'
              : 'Customer reviews will appear here for moderation.'
          }
        />
      )}

      <div className="space-y-3">
        {reviews.map((review) => {
          const reportCount = review.reports?.length || review.reportCount || 0;
          return (
            <div key={review._id} className="surface rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {review.user?.name} on {review.provider?.businessName}
                  </p>
                  <StarRating value={review.rating} size="sm" />
                  {reportCount > 0 && (
                    <p className="mt-1 text-xs font-bold text-amber-700">
                      {reportCount} report{reportCount === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {reportCount > 0 && (
                    <Button
                      variant="secondary"
                      className="!py-2 !text-sm"
                      onClick={() => clearReports(review._id)}
                    >
                      Dismiss reports
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="!py-2 !text-sm"
                    onClick={() => remove(review._id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{review.comment}</p>
              {reportCount > 0 && (
                <ul className="mt-3 space-y-1 rounded-xl bg-amber-50/80 p-3 text-xs text-amber-900">
                  {review.reports.map((r, idx) => (
                    <li key={idx}>
                      <span className="font-semibold">{r.user?.name || 'User'}:</span>{' '}
                      {r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
