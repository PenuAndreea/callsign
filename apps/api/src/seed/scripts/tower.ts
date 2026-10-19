import type { Exchange, NetScript } from '../seed.types';
import { spoken } from './spoken';

const CONTROLLER = 'tower';
const PILOTS = ['wolf-2', 'eagle-1', 'falcon-7', 'kestrel-4'] as const;
const WINDS = ['250 at 8', '260 at 12', '240 at 6, gusting 15', '270 at 10', 'calm'] as const;

interface Call {
  pilot: string;
  runway: string;
  wind: string;
}

type Template = (call: Call) => Exchange;

/** Tower phraseology, one function per kind of exchange. `P` is the pilot as spoken. */
const TEMPLATES: readonly [Template, ...Template[]] = [
  ({ pilot, runway, wind }) => {
    const p = spoken(pilot);
    return [
      { from: pilot, text: `Tower, ${p}, holding short runway ${runway}, ready for departure.` },
      { from: CONTROLLER, text: `${p}, wind ${wind}, runway ${runway}, cleared for takeoff.` },
      { from: pilot, text: `Cleared for takeoff runway ${runway}, ${p}.` },
    ];
  },
  ({ pilot, runway, wind }) => {
    const p = spoken(pilot);
    return [
      { from: pilot, text: `Tower, ${p}, five miles final runway ${runway}.` },
      {
        from: CONTROLLER,
        text: `${p}, number one, wind ${wind}, runway ${runway}, cleared to land.`,
      },
      { from: pilot, text: `Cleared to land runway ${runway}, ${p}.` },
      { from: CONTROLLER, text: `${p}, vacate left via Bravo, contact Ground. Over.` },
    ];
  },
  ({ pilot }) => {
    const p = spoken(pilot);
    return [
      { from: pilot, text: `Tower, ${p}, radio check. Over.` },
      { from: CONTROLLER, text: `${p}, reading you five by five.` },
    ];
  },
  ({ pilot }) => {
    const p = spoken(pilot);
    return [
      {
        from: CONTROLLER,
        text: `${p}, traffic two o'clock, four miles, opposite direction, two thousand feet.`,
      },
      { from: pilot, text: `Looking out, ${p}.` },
      { from: pilot, text: `Traffic in sight, ${p}.` },
    ];
  },
  ({ pilot, runway }) => {
    const p = spoken(pilot);
    return [
      {
        from: CONTROLLER,
        text: `${p}, go around, I say again, go around. Runway ${runway} occupied.`,
      },
      { from: pilot, text: `Going around, ${p}.` },
      { from: CONTROLLER, text: `${p}, climb two thousand, right turn, rejoin downwind.` },
      { from: pilot, text: `Two thousand, right turn, ${p}. Wilco.` },
    ];
  },
  ({ pilot }) => {
    const p = spoken(pilot);
    return [
      {
        from: CONTROLLER,
        text: `${p}, contact Approach on one-two-four decimal three-five. Good day.`,
      },
      { from: pilot, text: `One-two-four decimal three-five, ${p}. Good day.` },
    ];
  },
];

const EXCHANGE_COUNT = 40;

/**
 * About 115 calls over three days: enough for several history pages (20 per page) and a day
 * separator or two. Runway 27 most of the time, 09 for a stretch when the wind would turn.
 */
function towerExchanges(): Exchange[] {
  return Array.from({ length: EXCHANGE_COUNT }, (_, index) =>
    cycle(
      TEMPLATES,
      index,
    )({
      pilot: cycle(PILOTS, index * 3),
      runway: index >= 14 && index < 20 ? '09' : '27',
      wind: cycle(WINDS, index),
    }),
  );
}

/** The item at `index`, wrapping around the list. */
function cycle<T>(list: readonly [T, ...T[]], index: number): T {
  return list[index % list.length] ?? list[0];
}

export const towerScript: NetScript = {
  fromMinutesAgo: 3 * 24 * 60,
  toMinutesAgo: 8,
  exchanges: towerExchanges(),
};
