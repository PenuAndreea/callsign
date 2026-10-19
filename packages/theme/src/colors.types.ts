/**
 * Semantic color keys shared by both schemes, so components only ever use names
 * (`colors.surface`, `colors.primary`, ...) and never raw values.
 */
export interface ThemeColors {
  /** App background */
  background: string;
  /** Cards, incoming message bubbles, list rows, inputs */
  surface: string;
  /** Inputs inside a surface (composer field), nested controls */
  surfaceInset: string;
  /** Bottom composer sheet */
  sheet: string;
  /** Primary text */
  text: string;
  /** Secondary text, meta, placeholders */
  textMuted: string;
  /** Small stencil labels (sender callsign, field labels) */
  label: string;
  /** Primary action fill (Report in, Request clearance, TX). Brass in dark, olive drab in light. */
  primary: string;
  /** Text/icon color on top of `primary` */
  onPrimary: string;
  /** Soft ring around primary buttons (translucent `primary`) */
  primaryHalo: string;
  /** Outgoing message bubble fill */
  bubbleOut: string;
  /** Text on outgoing bubble */
  bubbleOutText: string;
  /** Meta text (time) on outgoing bubble */
  bubbleOutMeta: string;
  /** Joined / active status dot */
  lampOn: string;
  /** Inactive status dot */
  lampOff: string;
  /** Frequency display panel (splash tuner) */
  display: string;
  /** Digits on the frequency display */
  displayText: string;
  /** Small labels on the frequency display (TUNING, MHZ) */
  displayMuted: string;
  /** Scale ticks on the frequency display (decorative) */
  tick: string;
  /** Tuning needle on the frequency display */
  needle: string;
  /** Destructive action fill */
  danger: string;
  /** Text on `danger` fill */
  onDanger: string;
  /** Readable danger text on a normal surface (form errors) */
  dangerText: string;
  /** Soft danger background (error banner) */
  dangerSoft: string;
  /** Card shadow color (low opacity) */
  shadow: string;
}

export type ColorScheme = 'light' | 'dark';
