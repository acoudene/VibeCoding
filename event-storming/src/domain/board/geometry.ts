import { InvalidRectError } from "./errors";

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function position(x: number, y: number): Position {
  return { x, y };
}

/** Rectangle dont la largeur et la hauteur sont strictement positives. */
export function rect(x: number, y: number, width: number, height: number): Rect {
  if (!(width > 0) || !(height > 0)) throw new InvalidRectError();
  return { x, y, width, height };
}

export function rectArea(r: Rect): number {
  return r.width * r.height;
}

/** Bords inclus. */
export function rectContains(r: Rect, p: Position): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}
