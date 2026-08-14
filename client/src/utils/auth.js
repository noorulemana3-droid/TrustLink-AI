/** Role-based dashboard paths (internship Task 2). */
export function getDashboardPath(role) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'provider') return '/dashboard/provider';
  return '/dashboard/customer';
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
