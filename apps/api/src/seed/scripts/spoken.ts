const DIGITS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

/** A callsign as it is said on the radio: `wolf-2` → `Wolf Two`. */
export function spoken(callsign: string): string {
  return callsign
    .split('-')
    .map((part) =>
      /^\d+$/.test(part)
        ? [...part].map((digit) => DIGITS[Number(digit)]).join(' ')
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
}
