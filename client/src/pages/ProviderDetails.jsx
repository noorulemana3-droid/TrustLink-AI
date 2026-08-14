import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, StarRating, TrustBadges, formatLastActive } from '../components/ui';
import Button from '../components/Button';
import Input from '../components/Input';
import {
  createReview,
  deleteReview,
  getMyReview,
  listProviderReviews,
  reportReview,
  updateReview,
} from '../services/reviews';
import { toggleFavorite } from '../services/favorites';
import { createRequest } from '../services/requests';
import { getReviewSummary } from '../services/ai';
import {
  buildTelUrl,
  buildWhatsAppUrl,
  defaultHireMessage,
  getProviderPhone,
  openExternal,
} from '../utils/contact';
import { formatPkr, formatPkrRange } from '../utils/money';
import { formatWorkingHours } from '../utils/time';
import {
  PAYMENT_METHODS,
  formatPaymentMethods,
  paymentMethodLabel,
} from '../utils/payments';

export default function ProviderDetails() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [summary, setSummary] = useState('');
  const [summaryMeta, setSummaryMeta] = useState({ source: '', themes: null });
  const [myReview, setMyReview] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [whatsAppPrompt, setWhatsAppPrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [requestForm, setRequestForm] = useState({
    service: '',
    description: '',
    budget: '',
    preferredDate: '',
    preferredHour: '',
    preferredMinute: '00',
    preferredPeriod: 'AM',
    location: '',
    customerPhone: '',
    paymentMethod: 'jazzcash',
  });

  const formatPreferredTime = () => {
    if (!requestForm.preferredHour) return '';
    return `${requestForm.preferredHour}:${requestForm.preferredMinute || '00'} ${
      requestForm.preferredPeriod || 'AM'
    }`;
  };

  const isOwner =
    user &&
    provider &&
    String(provider.owner?._id || provider.owner) === String(user.id || user._id);

  const favorited = user?.favorites?.some((f) => String(f._id || f) === String(id));

  const phone = getProviderPhone(provider);
  const whatsappUrl = buildWhatsAppUrl(phone, defaultHireMessage(provider));
  const telUrl = buildTelUrl(phone);

  const load = async () => {
    setLoading(true);
    try {
      const [p, r, s] = await Promise.all([
        api.get(`/providers/${id}`),
        listProviderReviews(id),
        getReviewSummary(id).catch(() => ({ summary: '', source: '', themes: null })),
      ]);
      setProvider(p.data.provider);
      setReviews(r.reviews || []);
      setDistribution(r.distribution || null);
      setSummary(s.summary || '');
      setSummaryMeta({ source: s.source || '', themes: s.themes || null });

      if (user) {
        const mine = await getMyReview(id).catch(() => ({ review: null }));
        setMyReview(mine.review || null);
        if (mine.review) {
          setReviewForm({
            rating: mine.review.rating,
            comment: mine.review.comment || '',
          });
        }
      } else {
        setMyReview(null);
      }
    } catch {
      setProvider(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user?.id || user?._id]);

  useEffect(() => {
    if (provider && user) {
      const accepted = provider.paymentMethods?.length
        ? provider.paymentMethods
        : PAYMENT_METHODS.map((m) => m.id);
      setRequestForm((prev) => ({
        ...prev,
        service: prev.service || provider.category?.name || '',
        location: prev.location || user.city || '',
        customerPhone: prev.customerPhone || user.phone || '',
        paymentMethod: accepted.includes(prev.paymentMethod)
          ? prev.paymentMethod
          : accepted[0],
      }));
    }
  }, [provider, user]);

  const onFavorite = async () => {
    if (!user) return toast('Login to save favorites', 'info');
    try {
      const data = await toggleFavorite(id);
      await refreshUser();
      toast(data.favorited ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      toast(err.response?.data?.message || 'Favorite failed', 'error');
    }
  };

  const openWhatsApp = (extraMessage = '') => {
    if (!phone) {
      toast('This provider has no phone number yet', 'error');
      return;
    }
    const url = buildWhatsAppUrl(
      phone,
      extraMessage || defaultHireMessage(provider)
    );
    openExternal(url);
  };

  const openCall = () => {
    if (!telUrl) {
      toast('This provider has no phone number yet', 'error');
      return;
    }
    window.location.href = telUrl;
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return toast('Login to leave a review', 'info');
    if (isOwner) return toast('You cannot review your own business', 'error');
    if (!reviewForm.comment || reviewForm.comment.trim().length < 10) {
      return toast('Comment must be at least 10 characters', 'error');
    }

    try {
      if (myReview) {
        await updateReview(myReview._id, reviewForm);
        toast('Review updated');
      } else {
        await createReview({ provider: id, ...reviewForm });
        toast('Review submitted');
      }
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save review', 'error');
    }
  };

  const removeMyReview = async () => {
    if (!myReview || !confirm('Delete your review?')) return;
    try {
      await deleteReview(myReview._id);
      setMyReview(null);
      setReviewForm({ rating: 5, comment: '' });
      toast('Review deleted');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const onReportReview = async (reviewId) => {
    if (!user) return toast('Login to report a review', 'info');
    const reason = window.prompt(
      'Why are you reporting this review?\n(e.g. Fake or spam, Abusive language)',
      'Fake or spam'
    );
    if (reason === null) return;
    try {
      await reportReview(reviewId, reason.trim() || 'Fake or spam');
      toast('Report submitted — thanks for keeping TrustLink safe');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not report review', 'error');
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!user) return toast('Login to request a service', 'info');
    if (isOwner) return toast('You cannot request your own service', 'error');
    if (!requestForm.description || requestForm.description.trim().length < 10) {
      return toast('Description must be at least 10 characters', 'error');
    }

    const description = requestForm.description.trim();
    try {
      await createRequest({
        provider: id,
        service: requestForm.service,
        description,
        budget: Number(requestForm.budget) || 0,
        preferredDate: requestForm.preferredDate || undefined,
        preferredTime: formatPreferredTime(),
        location: requestForm.location,
        customerPhone: requestForm.customerPhone,
        paymentMethod: requestForm.paymentMethod,
      });
      toast('Service request submitted');
      setShowRequest(false);
      setRequestForm((prev) => ({
        ...prev,
        description: '',
        budget: '',
        preferredDate: '',
        preferredHour: '',
        preferredMinute: '00',
        preferredPeriod: 'AM',
      }));

      if (phone && !isOwner) {
        setWhatsAppPrompt({
          message: defaultHireMessage(
            provider,
            `Request: ${requestForm.service || 'service'}\n${description}${
              requestForm.budget ? `\nBudget: ${formatPkr(requestForm.budget)}` : ''
            }${requestForm.location ? `\nLocation: ${requestForm.location}` : ''}${
              requestForm.paymentMethod
                ? `\nPayment: ${paymentMethodLabel(requestForm.paymentMethod)}`
                : ''
            }`
          ),
        });
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Could not send request', 'error');
    }
  };

  const avg = provider?.ratingAvg ?? provider?.averageRating ?? 0;
  const count = provider?.ratingCount ?? provider?.totalReviews ?? 0;

  const distBars = useMemo(() => {
    if (!distribution) return null;
    const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: distribution[star] || 0,
      pct: ((distribution[star] || 0) / total) * 100,
    }));
  }, [distribution]);

  if (loading) {
    return <div className="page-shell py-16 text-ink-soft">Loading provider...</div>;
  }

  if (!provider) {
    return (
      <div className="page-shell py-16">
        <EmptyState title="Provider not found" text="This profile may be pending approval." />
      </div>
    );
  }

  return (
    <div className="page-shell py-6 pb-32 sm:py-10 lg:pb-10">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="animate-rise">
          <div className="overflow-hidden rounded-3xl">
            <img
              src={
                provider.profileImage ||
                provider.images?.[0] ||
                'https://placehold.co/1200x700/0f2f38/e8f4f2?text=Provider'
              }
              alt={provider.businessName}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          {(provider.galleryImages || provider.images || []).length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(provider.galleryImages || provider.images).slice(0, 4).map((src) => (
                <img key={src} src={src} alt="" className="aspect-video w-full rounded-xl object-cover" />
              ))}
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-wide text-sea">
              {provider.category?.name}
            </p>
            <h1 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">
              {provider.businessName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <StarRating value={avg} />
              <span>
                {avg} ({count} reviews)
              </span>
              <span>
                · {provider.city}
                {provider.area ? `, ${provider.area}` : ''}
              </span>
              <span
                className={
                  provider.available !== false
                    ? 'font-semibold text-sea'
                    : 'font-semibold text-rose-600'
                }
              >
                {provider.available !== false ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="mt-3">
              <TrustBadges provider={provider} size="md" />
            </div>
            {formatLastActive(provider.lastActiveAt) && (
              <p className="mt-2 text-sm text-ink-soft">
                {formatLastActive(provider.lastActiveAt)}
                {typeof provider.responseRate === 'number' && provider.responseRate > 0
                  ? ` · Usually replies (${provider.responseRate}% response rate)`
                  : ''}
              </p>
            )}

            <div className="surface mt-6 rounded-3xl p-5">
              <h2 className="font-display text-xl font-bold">Why Trust This Provider?</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                {(provider.verified ||
                  provider.status === 'approved' ||
                  provider.isApproved) && (
                  <li>
                    ✓ Admin Verified
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Verified: Provider profile has been reviewed and approved by
                      TrustLink AI admin.
                    </p>
                  </li>
                )}
                {count > 0 && (
                  <li>
                    ⭐ {Number(avg).toFixed(1)} Rating
                  </li>
                )}
                {count > 0 && (
                  <li>
                    💬 {count} Review{count === 1 ? '' : 's'}
                  </li>
                )}
                {typeof provider.responseRate === 'number' && provider.responseRate > 0 && (
                  <li>⚡ {provider.responseRate}% Response Rate</li>
                )}
                {provider.available !== undefined && (
                  <li>
                    🕒{' '}
                    {provider.available !== false ? 'Available' : 'Unavailable'}
                  </li>
                )}
                {(provider.city || provider.area) && (
                  <li>
                    📍 {[provider.area, provider.city].filter(Boolean).join(', ')}
                  </li>
                )}
              </ul>
            </div>

            <p className="mt-5 leading-relaxed text-ink-soft">{provider.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(provider.services || []).map((service) => (
                <span key={service} className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">
                  {service}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="surface rounded-2xl p-4">
                <p className="text-ink-soft">Experience</p>
                <p className="mt-1 text-lg font-bold">
                  {provider.experienceYears ?? provider.experience} years
                </p>
              </div>
              <div className="surface rounded-2xl p-4">
                <p className="text-ink-soft">Price range</p>
                <p className="mt-1 text-lg font-bold">
                  {formatPkrRange(provider.priceRange?.min, provider.priceRange?.max)}
                </p>
              </div>
              <div className="surface rounded-2xl p-4">
                <p className="text-ink-soft">Hours</p>
                <p className="mt-1 text-lg font-bold">
                  {formatWorkingHours(
                    provider.workingHours?.from,
                    provider.workingHours?.to
                  )}
                </p>
              </div>
              <div className="surface rounded-2xl p-4">
                <p className="text-ink-soft">Payment methods</p>
                <p className="mt-1 text-lg font-bold">
                  {formatPaymentMethods(provider.paymentMethods) || 'JazzCash · EasyPaisa · Card · Cash'}
                </p>
              </div>
              <div className="surface rounded-2xl p-4">
                <p className="text-ink-soft">Address</p>
                <p className="mt-1 text-lg font-bold">
                  {provider.address || provider.area || provider.city}
                </p>
              </div>
            </div>
          </div>

          <div className="surface mt-8 rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-bold">AI review summary</h2>
              {summaryMeta.source && (
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink-soft">
                  {summaryMeta.source === 'llm' ? 'AI summary' : 'Auto summary'}
                </span>
              )}
            </div>
            <p className="mt-3 leading-relaxed text-ink-soft">
              {summary || 'No summary yet.'}
            </p>
            {(summaryMeta.themes?.strengths?.length > 0 ||
              summaryMeta.themes?.concerns?.length > 0) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {summaryMeta.themes.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                      Strengths
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      {summaryMeta.themes.strengths.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {summaryMeta.themes.concerns?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Watch-outs
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      {summaryMeta.themes.concerns.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-amber-50 px-3 py-1 text-amber-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Reviews</h2>
                <p className="text-sm text-ink-soft">
                  {avg} average · {count} total
                </p>
              </div>
            </div>

            {distBars && (
              <div className="surface mb-5 space-y-2 rounded-2xl p-4">
                {distBars.map((row) => (
                  <div key={row.star} className="flex items-center gap-3 text-sm">
                    <span className="w-8 font-semibold">{row.star}★</span>
                    <div className="h-2 flex-1 rounded-full bg-mist">
                      <div
                        className="h-2 rounded-full bg-sea"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-ink-soft">{row.count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {reviews.length === 0 && (
                <p className="text-sm text-ink-soft">No reviews yet.</p>
              )}
              {reviews.map((review) => (
                <div key={review._id} className="surface rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{review.user?.name || 'Customer'}</p>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{review.comment}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-soft">
                      {new Date(review.createdAt).toLocaleDateString()}
                      {(review.reports?.length || review.reportCount) > 0 && (
                        <span className="ml-2 text-amber-700">
                          · {review.reports?.length || review.reportCount} report(s)
                        </span>
                      )}
                    </p>
                    {user &&
                      String(review.user?._id || review.user) !==
                        String(user.id || user._id) && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-ink-soft underline hover:text-rose-700"
                          onClick={() => onReportReview(review._id)}
                        >
                          Report
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {!isOwner && (
              <form onSubmit={submitReview} className="surface mt-6 rounded-3xl p-5">
                <h3 className="font-display text-xl font-bold">
                  {myReview ? 'Edit your review' : 'Write a Review'}
                </h3>
                {!user && (
                  <p className="mt-2 text-sm text-ink-soft">
                    <Link to="/login" className="font-bold text-sea">
                      Login
                    </Link>{' '}
                    to submit a review.
                  </p>
                )}
                <label className="label mt-4">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`text-2xl ${n <= reviewForm.rating ? 'text-coral' : 'text-mist'}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <Input
                  className="mt-3"
                  label="Comment"
                  as="textarea"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience (min 10 characters)"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="submit" disabled={!user}>
                    {myReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                  {myReview && (
                    <Button type="button" variant="ghost" onClick={removeMyReview}>
                      Delete Review
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        <aside className="hidden space-y-5 lg:block">
          <div className="surface sticky top-24 space-y-2 rounded-3xl p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-sea">Hire fast</p>
            <Button className="w-full" onClick={() => setShowRequest(true)} disabled={isOwner}>
              Request Service
            </Button>
            <Button
              type="button"
              className="w-full !border-transparent !bg-[#25D366] !text-white hover:!brightness-95"
              onClick={() => openWhatsApp()}
              disabled={isOwner || !whatsappUrl}
            >
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={openCall}
              disabled={isOwner || !telUrl}
            >
              Call
            </Button>
            <Button variant="secondary" className="w-full" onClick={onFavorite}>
              {favorited ? '♥ Favorited' : '♡ Favorite'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowContact((v) => !v)}>
              {showContact ? 'Hide Contact' : 'View Contact'}
            </Button>
            {showContact && (
              <div className="rounded-xl bg-mist/50 p-3 text-sm text-ink-soft">
                <p>Phone: {phone || 'On request'}</p>
                <p>
                  Email:{' '}
                  {provider.contactEmail || provider.email || provider.owner?.email || 'On request'}
                </p>
              </div>
            )}
            <p className="pt-1 text-xs text-ink-soft">
              Most customers message on WhatsApp after checking reviews.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile sticky hire bar */}
      {!isOwner && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-[#f7fbfa]/95 px-3 pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!min-h-12 !min-w-12 !px-3"
              onClick={onFavorite}
              aria-label="Favorite"
            >
              {favorited ? '♥' : '♡'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!min-h-12 !min-w-12 !px-3"
              onClick={openCall}
              disabled={!telUrl}
              aria-label="Call"
            >
              Call
            </Button>
            <Button
              type="button"
              className="!min-h-12 flex-1 !border-transparent !bg-[#25D366] !text-white"
              onClick={() => openWhatsApp()}
              disabled={!whatsappUrl}
            >
              WhatsApp
            </Button>
            <Button
              type="button"
              className="!min-h-12 flex-1"
              onClick={() => setShowRequest(true)}
            >
              Request
            </Button>
          </div>
        </div>
      )}

      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-bold">Request Service</h3>
              <button type="button" className="font-bold text-sea" onClick={() => setShowRequest(false)}>
                Close
              </button>
            </div>
            {!user ? (
              <p className="mt-4 text-sm">
                Please{' '}
                <Link to="/login" className="font-bold text-sea">
                  login
                </Link>{' '}
                to continue.
              </p>
            ) : (
              <form onSubmit={submitRequest} className="mt-4 space-y-3">
                <Input
                  label="Service"
                  value={requestForm.service}
                  onChange={(e) => setRequestForm({ ...requestForm, service: e.target.value })}
                />
                <Input
                  label="Description"
                  as="textarea"
                  required
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                />
                <Input
                  label="Budget (PKR)"
                  type="number"
                  value={requestForm.budget}
                  onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })}
                />
                <Input
                  label="Preferred date"
                  type="date"
                  value={requestForm.preferredDate}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, preferredDate: e.target.value })
                  }
                />
                <div>
                  <p className="label">Preferred time</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      as="select"
                      aria-label="Hour"
                      value={requestForm.preferredHour}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, preferredHour: e.target.value })
                      }
                    >
                      <option value="">Hour</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Input>
                    <Input
                      as="select"
                      aria-label="Minutes"
                      value={requestForm.preferredMinute}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, preferredMinute: e.target.value })
                      }
                    >
                      {['00', '15', '30', '45'].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Input>
                    <Input
                      as="select"
                      aria-label="AM or PM"
                      value={requestForm.preferredPeriod}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, preferredPeriod: e.target.value })
                      }
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </Input>
                  </div>
                </div>
                <Input
                  label="Payment method"
                  as="select"
                  value={requestForm.paymentMethod}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, paymentMethod: e.target.value })
                  }
                >
                  {(provider.paymentMethods?.length
                    ? PAYMENT_METHODS.filter((m) => provider.paymentMethods.includes(m.id))
                    : PAYMENT_METHODS
                  ).map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </Input>
                <Input
                  label="Location"
                  value={requestForm.location}
                  onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={requestForm.customerPhone}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, customerPhone: e.target.value })
                  }
                />
                <Button type="submit" className="w-full">
                  Submit Request
                </Button>
                {whatsappUrl && (
                  <button
                    type="button"
                    className="w-full text-center text-sm font-semibold text-[#128C7E]"
                    onClick={() => openWhatsApp()}
                  >
                    Or message on WhatsApp instead →
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {whatsAppPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="surface w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-bold">Request sent</h3>
            <p className="mt-3 text-sm text-ink-soft">
              Want a faster reply? Message {provider.businessName} on WhatsApp with your request
              details.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                className="w-full !border-transparent !bg-[#25D366] !text-white"
                onClick={() => {
                  openWhatsApp(whatsAppPrompt.message);
                  setWhatsAppPrompt(null);
                }}
              >
                Also message on WhatsApp
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setWhatsAppPrompt(null)}
              >
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
