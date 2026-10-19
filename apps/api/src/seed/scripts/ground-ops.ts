import type { NetScript } from '../seed.types';

/** Today's ramp and taxi traffic: Ground with Wolf Two, Nomad Three and Raven Nine (the tug). */
export const groundOpsScript: NetScript = {
  fromMinutesAgo: 5 * 60,
  toMinutesAgo: 3,
  exchanges: [
    [
      {
        from: 'ground',
        text: 'All stations, Ground is open. Information Alpha current, runway 27 in use.',
      },
      { from: 'ground', text: 'Taxiway Charlie closed between C2 and C3 for works. Over.' },
    ],
    [
      { from: 'nomad-3', text: 'Ground, Nomad Three, stand 4, request start-up.' },
      { from: 'ground', text: 'Nomad Three, start-up approved. Report ready for taxi.' },
      { from: 'nomad-3', text: 'Start-up approved, Nomad Three.' },
    ],
    [
      { from: 'raven-9', text: 'Ground, Raven Nine, tug at stand 6, request push for Wolf Two.' },
      { from: 'ground', text: 'Raven Nine, push approved, tail west.' },
      { from: 'raven-9', text: 'Push approved, tail west, Raven Nine.' },
    ],
    [
      { from: 'wolf-2', text: 'Ground, Wolf Two, ready for taxi.' },
      { from: 'ground', text: 'Wolf Two, taxi holding point runway 27 via Alpha, Bravo.' },
      { from: 'wolf-2', text: 'Alpha, Bravo, holding point 27, Wolf Two.' },
    ],
    [
      { from: 'nomad-3', text: 'Ground, Nomad Three, ready for taxi.' },
      { from: 'ground', text: 'Nomad Three, give way to Wolf Two passing left to right on Alpha.' },
      { from: 'nomad-3', text: 'Giving way to Wolf Two, Nomad Three.' },
    ],
    [
      { from: 'raven-9', text: 'Ground, Raven Nine, FOD on Alpha near A3. Small metal bracket.' },
      { from: 'raven-9', text: 'Picked it up. Alpha is clear.' },
      { from: 'ground', text: 'Thanks, Raven Nine. Logged. Over.' },
    ],
    [
      {
        from: 'ground',
        text: 'Nomad Three, taxi holding point runway 27 via Alpha, contact Tower when ready.',
      },
      { from: 'nomad-3', text: 'Holding point 27 via Alpha, Nomad Three. Wilco.' },
    ],
    [
      { from: 'wolf-2', text: 'Ground, Wolf Two, vacated via Bravo, request taxi to stand 6.' },
      { from: 'ground', text: 'Wolf Two, taxi stand 6 via Bravo, Alpha.' },
      { from: 'wolf-2', text: 'Stand 6 via Bravo, Alpha, Wolf Two.' },
    ],
    [
      { from: 'raven-9', text: 'Ground, Raven Nine, fuel bowser crossing Alpha to stand 6.' },
      { from: 'ground', text: 'Raven Nine, cross Alpha, report clear.' },
      { from: 'raven-9', text: 'Clear of Alpha, Raven Nine.' },
    ],
    [{ from: 'ground', text: 'All stations, Information Bravo now current. QNH 1017.' }],
    [
      { from: 'wolf-2', text: 'Ground, Wolf Two, radio check on the ramp.' },
      { from: 'ground', text: 'Wolf Two, five by five.' },
    ],
    [
      { from: 'nomad-3', text: 'Ground, Nomad Three, back on stand 4, shutting down.' },
      { from: 'ground', text: 'Nomad Three, copied. Good flight.' },
    ],
    [
      { from: 'ground', text: 'All stations, Taxiway Charlie open again. Works complete.' },
      { from: 'raven-9', text: 'Copied, Raven Nine.' },
      { from: 'wolf-2', text: 'Copied, Wolf Two.' },
    ],
    [
      {
        from: 'wolf-2',
        text: 'Ground, Wolf Two, stand 6, request start-up for the evening sortie.',
      },
      { from: 'ground', text: 'Wolf Two, start-up approved. Expect runway 27.' },
      { from: 'wolf-2', text: 'Start-up approved, Wolf Two.' },
    ],
  ],
};
