import { rectArea, rectContains, type Position, type Rect } from "./geometry";

export interface Frame {
  readonly id: string;
  readonly name: string;
  readonly rect: Rect;
}

/**
 * Cadre auquel appartient un post-it dont le centre est `stickyCenter` (bords inclus).
 * Plusieurs cadres : le plus petit ; à aire égale, le plus petit identifiant.
 */
export function frameOf(stickyCenter: Position, frames: readonly Frame[]): Frame | undefined {
  let best: Frame | undefined;
  for (const f of frames) {
    if (!rectContains(f.rect, stickyCenter)) continue;
    if (best === undefined) { best = f; continue; }
    const diff = rectArea(f.rect) - rectArea(best.rect);
    if (diff < 0 || (diff === 0 && f.id < best.id)) best = f;
  }
  return best;
}

export function nextFrameName(frames: readonly Frame[]): string {
  return `Contexte ${frames.length + 1}`;
}
