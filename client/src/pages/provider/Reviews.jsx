import { useEffect, useState } from 'react';
import api from '../../services/api';
import { EmptyState, StarRating } from '../../components/ui';

export default function ProviderReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reviews/mine/provider')
      .then((res) => setReviews(res.data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-ink-soft">Loading reviews…</p>;
  }

  if (!reviews.length) {
    return (
      <EmptyState
        title="No reviews yet"
        text="Reviews from customers will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review._id} className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">{review.user?.name}</p>
            <StarRating value={review.rating} size="sm" />
          </div>
          <p className="mt-2 text-sm text-ink-soft">{review.comment}</p>
          <p className="mt-2 text-xs text-ink-soft">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
