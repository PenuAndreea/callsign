/** "1 station", "4 stations": member counts in lists and headers. */
export function stationsLabel(count: number): string {
  return `${count} ${count === 1 ? 'station' : 'stations'}`;
}
