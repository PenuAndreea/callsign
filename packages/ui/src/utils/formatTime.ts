const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Formats a time as 24-hour hours and minutes in the device's time zone, e.g. `22:14`.
 * Accepts a Date or ISO string (the API sends UTC).
 */
export function formatTime(time: Date | string): string {
  const date = typeof time === 'string' ? new Date(time) : time;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid time: ${String(time)}`);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
