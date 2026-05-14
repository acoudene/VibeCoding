// Pusher requires presence channels to start with "presence-". The host and
// player UIs subscribe to `presence-room-${code}` for member info and bind
// gameplay events on the same channel — so server-side broadcasts must use
// the same name.
export function roomChannel(code: string): string {
  return `presence-room-${code}`;
}
