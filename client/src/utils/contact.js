/**
 * Pakistan-friendly contact helpers for WhatsApp / phone CTAs.
 */

/** Normalize to digits only; convert local 03xx… → 92… for wa.me */
export function toWhatsAppNumber(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`;
  }
  return digits;
}

export function getProviderPhone(provider) {
  return (
    provider?.contactPhone ||
    provider?.phone ||
    provider?.owner?.phone ||
    ''
  );
}

export function buildWhatsAppUrl(phone, message = '') {
  const num = toWhatsAppNumber(phone);
  if (!num) return '';
  const text = encodeURIComponent(message || '');
  return text
    ? `https://wa.me/${num}?text=${text}`
    : `https://wa.me/${num}`;
}

export function buildTelUrl(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  return `tel:${digits}`;
}

export function defaultHireMessage(provider, extra = '') {
  const name = provider?.businessName || 'your service';
  const city = [provider?.area, provider?.city].filter(Boolean).join(', ');
  const base = `Hi ${name}, I found you on TrustLink AI${city ? ` (${city})` : ''}. I'd like to hire you.`;
  return extra ? `${base}\n\n${extra}` : base;
}

export function openExternal(url) {
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
