export function StarRating({ value = 0, size = 'md' }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  const text = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className={`${text} tracking-tight text-coral`} aria-label={`${value} stars`}>
      {stars.map((star) => (
        <span key={star}>{star <= Math.round(value) ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-sky-100 text-sky-800',
    cancelled: 'bg-slate-200 text-slate-700',
    unpaid: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    released: 'bg-sky-100 text-sky-800',
    refunded: 'bg-slate-200 text-slate-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${map[status] || 'bg-mist text-ink'}`}
    >
      {status}
    </span>
  );
}

/** Market trust chips for provider cards / details */
export function TrustBadges({ provider, size = 'sm' }) {
  if (!provider) return null;
  const compact = size === 'sm';
  const base = compact
    ? 'rounded-full px-2 py-0.5 text-[11px] font-bold'
    : 'rounded-full px-2.5 py-1 text-xs font-bold';

  const badges = [];
  if (provider.verified) {
    badges.push(
      <span key="verified" className={`${base} bg-sea text-[#f3f7f6]`}>
        ✓ Verified
      </span>
    );
  }
  if (provider.status === 'approved' || provider.isApproved) {
    badges.push(
      <span key="approved" className={`${base} bg-emerald-100 text-emerald-900`}>
        Admin approved
      </span>
    );
  }
  if (typeof provider.responseRate === 'number' && provider.responseRate > 0) {
    badges.push(
      <span key="response" className={`${base} bg-mist text-ink-soft`}>
        {provider.responseRate}% responds
      </span>
    );
  }

  if (!badges.length) return null;
  return <div className="flex flex-wrap items-center gap-1.5">{badges}</div>;
}

export function formatLastActive(date) {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  const hours = Math.round((Date.now() - t) / (1000 * 60 * 60));
  if (hours < 1) return 'Active just now';
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Active yesterday';
  if (days < 14) return `Active ${days}d ago`;
  return `Active ${new Date(date).toLocaleDateString()}`;
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="surface rounded-2xl p-8 text-center">
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {text ? <p className="mt-2 text-ink-soft/80">{text}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
