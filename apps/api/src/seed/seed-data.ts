import { groundOpsScript } from './scripts/ground-ops';
import {
  maintenanceScript,
  nightShiftScript,
  northSectorScript,
  weatherDeskScript,
} from './scripts/desk-nets';
import { towerScript } from './scripts/tower';
import type { SeedNet } from './seed.types';

/** Every seeded station logs in with this. Development data only. */
export const SEED_PASSPHRASE = 'correct horse';

export const SEED_STATIONS = [
  'tower',
  'ground',
  'wolf-2',
  'eagle-1',
  'falcon-7',
  'kestrel-4',
  'raven-9',
  'nomad-3',
] as const;

/**
 * Logged in as `wolf-2`: joined `tower`, `ground ops`, `weather desk`; open to join the rest.
 * Each net covers a case the apps need to show: long paginated history, a busy day, short
 * previews, a net you are not in, 0 members with history, no messages, long text.
 */
export const SEED_NETS: readonly SeedNet[] = [
  {
    name: 'tower',
    createdBy: 'tower',
    members: ['wolf-2', 'eagle-1', 'falcon-7', 'kestrel-4'],
    script: towerScript,
  },
  {
    name: 'ground ops',
    createdBy: 'ground',
    members: ['wolf-2', 'nomad-3', 'raven-9'],
    script: groundOpsScript,
  },
  {
    name: 'weather desk',
    createdBy: 'falcon-7',
    members: ['wolf-2', 'kestrel-4'],
    script: weatherDeskScript,
  },
  {
    name: 'maintenance',
    createdBy: 'raven-9',
    members: ['nomad-3'],
    script: maintenanceScript,
  },
  {
    name: 'night shift',
    createdBy: 'kestrel-4',
    members: ['tower', 'raven-9'],
    leaveAfter: ['kestrel-4', 'tower', 'raven-9'],
    script: nightShiftScript,
  },
  {
    name: 'new frequency',
    createdBy: 'eagle-1',
    members: [],
  },
  {
    name: 'north sector approach ctl',
    createdBy: 'falcon-7',
    members: [],
    script: northSectorScript,
  },
];
