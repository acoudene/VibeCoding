export const STICKY_SIZE = { width: 160, height: 160 } as const;

export const stickyCenter = (x: number, y: number): { x: number; y: number } => ({
  x: x + STICKY_SIZE.width / 2,
  y: y + STICKY_SIZE.height / 2,
});
