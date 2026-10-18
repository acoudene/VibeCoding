import type { Position, Rect } from "../../../domain/board/geometry";

/** Glissement minimal (px à l'écran, sur chaque axe) pour dessiner un cadre : en deçà, c'est un clic. */
export const MIN_FRAME_DRAG = 8;

/** Rectangle entre le point de départ et le point courant d'un glissement, quel que soit son sens. */
export function rectBetween(start: Position, end: Position): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/** Vrai si le rectangle glissé (à l'écran) est assez grand pour créer un cadre. */
export function isFrameDrag(screenRect: Rect): boolean {
  return screenRect.width >= MIN_FRAME_DRAG && screenRect.height >= MIN_FRAME_DRAG;
}
