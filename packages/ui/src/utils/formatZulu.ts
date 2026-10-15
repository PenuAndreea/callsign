const pad = (value: number) => String(value).padStart(2, '0');

/** Formats a time as Zulu (UTC) hours and minutes, e.g. `22:14Z`. Accepts a Date or ISO string. */
export function formatZulu(time: Date | string): string {
  const date = typeof time === 'string' ? new Date(time) : time;
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid time: ${String(time)}`);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`;
}
