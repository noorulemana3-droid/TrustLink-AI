/** Convert "09:00" / "21:30" to "9:00 AM" style. */
export function formatTime12(value) {
  if (!value || typeof value !== 'string') return '';
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;
  let hour = Number(match[1]);
  const minute = match[2];
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}

export function formatWorkingHours(from, to) {
  const start = formatTime12(from);
  const end = formatTime12(to);
  if (!start && !end) return 'Hours not set';
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} – ${end}`;
}
