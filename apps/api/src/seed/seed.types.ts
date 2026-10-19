/** One radio call in a seed script: the station that says it and what it says. */
export interface ScriptLine {
  from: string;
  text: string;
}

/** Calls said back and forth in one go, `LINE_SPACING_SECONDS` apart. */
export type Exchange = readonly ScriptLine[];

/**
 * The history of one net. The exchanges are spread evenly from `fromMinutesAgo` to
 * `toMinutesAgo` (when each one starts), counted back from the moment the seed runs.
 */
export interface NetScript {
  fromMinutesAgo: number;
  toMinutesAgo: number;
  exchanges: readonly Exchange[];
}

export interface SeedNet {
  name: string;
  createdBy: string;
  /** Joined after the creator, in this order. */
  members: readonly string[];
  /** Stations (creator included) that leave once the history is written. */
  leaveAfter?: readonly string[];
  script?: NetScript;
}

/** What `Seeder.run` wrote, for the summary it prints. */
export interface SeedSummary {
  stations: number;
  nets: { name: string; members: number; messages: number }[];
}
