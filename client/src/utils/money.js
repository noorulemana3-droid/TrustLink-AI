/** Format amounts as Pakistani Rupees for display. */
export function formatPkr(amount, { fallback = 'Rs 0' } = {}) {
  if (amount === null || amount === undefined || amount === '') return fallback;
  const n = Number(amount);
  if (Number.isNaN(n)) return fallback;
  return `Rs ${n.toLocaleString('en-PK')}`;
}

/** Format a min–max price range. */
export function formatPkrRange(min, max) {
  const hasMin = min !== null && min !== undefined && min !== '';
  const hasMax = max !== null && max !== undefined && max !== '';
  if (!hasMin && !hasMax) return formatPkr(0);
  if (!hasMax) return `${formatPkr(min)}+`;
  if (!hasMin) return `Up to ${formatPkr(max)}`;
  return `${formatPkr(min)}–${formatPkr(max)}`;
}
