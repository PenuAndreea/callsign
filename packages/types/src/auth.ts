import { z } from 'zod';

/** Username and display name. Stored lowercase so uniqueness is case-insensitive; the UI uppercases it. */
export const callsignSchema = z.string().trim().toLowerCase().min(3).max(20);

export type Callsign = z.infer<typeof callsignSchema>;
