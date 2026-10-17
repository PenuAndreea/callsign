/** Every socket of one user (all their devices). */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Every socket of every member of a net. */
export function netRoom(roomId: string): string {
  return `room:${roomId}`;
}
