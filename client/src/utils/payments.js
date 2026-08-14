export const PAYMENT_METHODS = [
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'EasyPaisa' },
  { id: 'card', label: 'Card' },
  { id: 'cash', label: 'Cash' },
];

export const PAYMENT_LABEL = PAYMENT_METHODS.reduce((acc, method) => {
  acc[method.id] = method.label;
  return acc;
}, { demo: 'Demo wallet' });

export const paymentMethodLabel = (id) =>
  PAYMENT_LABEL[String(id || '').toLowerCase()] || id || '';

export const formatPaymentMethods = (methods) => {
  if (!Array.isArray(methods) || methods.length === 0) return '';
  return methods.map(paymentMethodLabel).filter(Boolean).join(' · ');
};
