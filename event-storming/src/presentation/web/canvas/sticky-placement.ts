import type { Position } from "../../../domain/board/geometry";
import { STICKY_SIZE } from "../../../domain/board/sticky";

/** Coin haut-gauche d'un post-it posé au clic : centré sur le pointeur, comme dans Miro (ADR-0016). */
export function stickyPositionCenteredOn(point: Position): Position {
  return { x: point.x - STICKY_SIZE.width / 2, y: point.y - STICKY_SIZE.height / 2 };
}
