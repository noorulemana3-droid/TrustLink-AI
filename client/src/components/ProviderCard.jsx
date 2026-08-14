import { Link } from 'react-router-dom';
import { StarRating, TrustBadges } from './ui';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
  buildWhatsAppUrl,
  defaultHireMessage,
  getProviderPhone,
  openExternal,
} from '../utils/contact';
import { formatPkrRange } from '../utils/money';
import { formatPaymentMethods } from '../utils/payments';

export default function ProviderCard({ provider, onFavoriteChange }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const image =
    provider.profileImage ||
    provider.images?.[0] ||
    'https://placehold.co/800x500/0f2f38/e8f4f2?text=Provider';

  const favorited = user?.favorites?.some(
    (f) => String(f._id || f) === String(provider._id)
  );

  const phone = getProviderPhone(provider);
  const whatsappUrl = buildWhatsAppUrl(phone, defaultHireMessage(provider));

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Login to save favorites', 'info');
      return;
    }
    try {
      await api.post('/favorites/toggle', { providerId: provider._id });
      await refreshUser();
      toast(favorited ? 'Removed from favorites' : 'Saved to favorites');
      onFavoriteChange?.();
    } catch {
      toast('Could not update favorite', 'error');
    }
  };

  const onWhatsApp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!whatsappUrl) {
      toast('No WhatsApp number for this provider', 'info');
      return;
    }
    openExternal(whatsappUrl);
  };

  return (
    <article className="surface group overflow-hidden rounded-2xl shadow-md shadow-ink/5 transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/providers/${provider._id}`} className="relative block">
        <div className="aspect-[16/10] overflow-hidden bg-mist">
          <img
            src={image}
            alt={provider.businessName}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            provider.available !== false
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {provider.available !== false ? 'Available' : 'Unavailable'}
        </span>
        {provider.verified && (
          <span className="absolute right-3 top-3 rounded-full bg-sea px-2.5 py-1 text-[11px] font-bold text-[#f3f7f6] shadow-sm">
            ✓ Verified
          </span>
        )}
      </Link>
      <div className="p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sea">
            {provider.category?.name || 'Service'}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold leading-tight">
            <Link to={`/providers/${provider._id}`}>{provider.businessName}</Link>
          </h3>
        </div>
        <div className="mt-2">
          <TrustBadges provider={provider} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft/80">
          {provider.description || 'Trusted local professional.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span>
            {provider.area ? `${provider.area}, ` : ''}
            {provider.city}
          </span>
          <span>{provider.experienceYears ?? provider.experience ?? 0}+ years experience</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <StarRating value={provider.ratingAvg ?? provider.averageRating} size="sm" />
          <span className="text-ink-soft">
            {(provider.ratingAvg ?? provider.averageRating)?.toFixed?.(1) || '0.0'} (
            {provider.ratingCount ?? provider.totalReviews ?? 0} reviews)
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-ink">
          {formatPkrRange(provider.priceRange?.min, provider.priceRange?.max)}
        </p>
        {formatPaymentMethods(provider.paymentMethods) ? (
          <p className="mt-1 text-xs text-ink-soft">
            {formatPaymentMethods(provider.paymentMethods)}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Link to={`/providers/${provider._id}`} className="min-w-0 flex-1">
            <Button variant="secondary" className="w-full !py-2 !text-sm">
              View Profile
            </Button>
          </Link>
          <button
            type="button"
            aria-label="WhatsApp"
            title="WhatsApp"
            onClick={onWhatsApp}
            className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-3 text-sm font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
          >
            WA
          </button>
          <button
            type="button"
            aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
            onClick={toggleFavorite}
            className={`rounded-xl border px-3 text-lg transition ${
              favorited
                ? 'border-coral/40 bg-coral/10 text-coral'
                : 'border-line bg-white text-ink-soft hover:border-sea hover:text-sea'
            }`}
          >
            {favorited ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </article>
  );
}
