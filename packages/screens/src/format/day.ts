const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (value: number) => String(value).padStart(2, '0');

/** The day of a time in the device's time zone, as `YYYY-MM-DD`, like the bubble times. */
export function dayKey(time: Date | string): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A day for a chat separator: `Today`, `Yesterday`, `17 Oct`, or `17 Oct 2025` in another year. */
export function dayLabel(time: Date | string, now: Date): string {
  const day = dayKey(time);
  if (day === dayKey(now)) return 'Today';
  // The calendar day before, not 24 hours earlier: a summer-time change makes a day 23 or 25 hours.
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day === dayKey(yesterday)) return 'Yesterday';
  const date = new Date(time);
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}
