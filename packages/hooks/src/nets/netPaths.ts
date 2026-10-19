/** Net ids come from the API, but encode anyway so a stray value can never change the path. */
export const netPath = (id: string) => `/rooms/${encodeURIComponent(id)}`;

export const membershipPath = (id: string) => `${netPath(id)}/members/me`;
