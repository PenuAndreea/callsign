import type { NetScript } from '../seed.types';

/** Weather observations, short lines that make short previews. */
export const weatherDeskScript: NetScript = {
  fromMinutesAgo: 10 * 60,
  toMinutesAgo: 25,
  exchanges: [
    [{ from: 'falcon-7', text: 'METAR 0650Z 24006KT 8000 BR SCT008 09/08 Q1019.' }],
    [
      { from: 'kestrel-4', text: 'Mist lifting over the field, visibility improving.' },
      { from: 'falcon-7', text: 'Copied. Next observation on the hour.' },
    ],
    [{ from: 'falcon-7', text: 'METAR 0750Z 25008KT 9999 FEW020 11/08 Q1018.' }],
    [
      { from: 'wolf-2', text: 'Weather desk, Wolf Two, what is the outlook for the afternoon?' },
      {
        from: 'falcon-7',
        text: 'Wolf Two, showers from 1400Z, cloud base down to 1500 ft in them.',
      },
      { from: 'wolf-2', text: 'Copied, thanks.' },
    ],
    [{ from: 'falcon-7', text: 'METAR 0950Z 26012KT 9999 SCT025 14/07 Q1017.' }],
    [
      {
        from: 'kestrel-4',
        text: 'Pilot report: light turbulence below 3000 ft on the approach to 27.',
      },
      { from: 'falcon-7', text: 'Copied, passing it to Tower.' },
    ],
    [{ from: 'falcon-7', text: 'METAR 1150Z 25015G25KT 9999 -SHRA BKN018 13/09 Q1016.' }],
    [{ from: 'falcon-7', text: 'Gusts up to 25 knots. Crosswind on 27 within limits. Over.' }],
  ],
};

/** The hangar: Raven Nine and Nomad Three. Wolf Two is not in it, so it shows under "Open to join". */
export const maintenanceScript: NetScript = {
  fromMinutesAgo: 24 * 60,
  toMinutesAgo: 2 * 60,
  exchanges: [
    [
      { from: 'raven-9', text: 'Hangar 2 open. Wolf Two in for the left brake.' },
      { from: 'nomad-3', text: 'Parts arrived on the morning truck.' },
    ],
    [{ from: 'raven-9', text: 'Left brake replaced, ops check good. Wolf Two released.' }],
    [
      { from: 'nomad-3', text: 'Nomad Three snag: intercom crackles on the rear seat.' },
      { from: 'raven-9', text: 'Copied. Will look at the jack box after the sortie.' },
    ],
    [
      { from: 'raven-9', text: 'Jack box connector was loose. Fixed and tested.' },
      { from: 'nomad-3', text: 'Thanks. Loud and clear now.' },
    ],
    [{ from: 'raven-9', text: 'Hangar 2 closing for the night. Keys at the ops desk.' }],
  ],
};

/** Last week's night shift. Everyone left after it, so the net has 0 members but keeps its history. */
export const nightShiftScript: NetScript = {
  fromMinutesAgo: 5 * 24 * 60 + 300,
  toMinutesAgo: 5 * 24 * 60,
  exchanges: [
    [
      { from: 'kestrel-4', text: 'Night shift on frequency. Field lighting on.' },
      { from: 'tower', text: 'Tower copies. Runway lights at full.' },
    ],
    [
      { from: 'raven-9', text: 'Raven Nine, runway inspection complete, nothing found.' },
      { from: 'tower', text: 'Thanks, Raven Nine.' },
    ],
    [
      { from: 'kestrel-4', text: 'Kestrel Four, night circuits, three to go.' },
      { from: 'tower', text: 'Kestrel Four, circuit is yours. Report final.' },
    ],
    [
      { from: 'kestrel-4', text: 'Kestrel Four, final, full stop.' },
      { from: 'tower', text: 'Kestrel Four, cleared to land runway 27.' },
    ],
    [
      { from: 'tower', text: 'Field closing. Lights off in ten minutes.' },
      { from: 'raven-9', text: 'Copied. Good night all.' },
      { from: 'kestrel-4', text: 'Good night. Kestrel Four, off frequency. Out.' },
    ],
  ],
};

const SECTOR_BRIEFING = [
  'Sector briefing for the week, read before your first sortie.',
  'North sector approach is active from 0600Z to 2200Z every day. Danger area D-114 is active Tuesday and Thursday from 0900Z to 1500Z, up to 6000 ft: stay clear and expect vectors around it.',
  'The northern reporting point is now the water tower east of the lake, not the old mast, which was taken down last month. Report it with altitude and intentions.',
  'Frequency congestion is high in the morning. Keep calls short, read back clearances in full, and listen before you transmit.',
  'Bird activity near the lake at dawn and dusk. Report flocks with position and altitude, and expect delays when the sweep vehicle is out.',
  'Lost comms: squawk 7600, follow the last clearance, and join overhead at 2000 ft for a standard circuit.',
  'Questions to Falcon Seven on this net. Over.',
].join(' ');

/** A long net name and one long message, for layout checks. */
export const northSectorScript: NetScript = {
  fromMinutesAgo: 2 * 24 * 60,
  toMinutesAgo: 6 * 60,
  exchanges: [
    [{ from: 'falcon-7', text: 'North sector approach net open.' }],
    [{ from: 'falcon-7', text: SECTOR_BRIEFING }],
    [{ from: 'falcon-7', text: 'Danger area D-114 cancelled for Thursday. Over.' }],
  ],
};
