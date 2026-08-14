const PAYMENT_METHODS = ['jazzcash', 'easypaisa', 'card', 'cash', 'demo'];
const PUBLIC_METHODS = ['jazzcash', 'easypaisa', 'card', 'cash'];

const normalizePaymentMethod = (value) => String(value || '').toLowerCase().trim();

const normalizePaymentMethods = (value) => {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim());
  return [
    ...new Set(
      list
        .map(normalizePaymentMethod)
        .filter((method) => PUBLIC_METHODS.includes(method))
    ),
  ];
};

module.exports = {
  PAYMENT_METHODS,
  PUBLIC_METHODS,
  normalizePaymentMethod,
  normalizePaymentMethods,
};
