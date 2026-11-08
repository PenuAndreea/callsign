/** Every socket of one user (all their devices). */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Every socket of one session (one device): closed together when the session ends. */
export function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

/** Every socket of every member of a net. */
export function netRoom(roomId: string): string {
  return `room:${roomId}`;
}
