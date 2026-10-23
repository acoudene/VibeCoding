import { Position as Side } from "@xyflow/react";
import type { Rect } from "../../../domain/board/geometry";

export interface FloatingEdgeEnds {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly sourcePosition: Side;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetPosition: Side;
}

/**
 * Extrémités d'un lien « flottant » (FR-021) : il part du milieu du côté de la source tourné vers la cible et
 * arrive au milieu du côté opposé de la cible. L'axe retenu est celui où l'écart entre les centres, rapporté à la
 * taille des rectangles, est le plus grand ; le lien suit donc les post-its déplacés.
 */
export function floatingEdgeEnds(source: Rect, target: Rect): FloatingEdgeEnds {
  const dx = center(target).x - center(source).x;
  const dy = center(target).y - center(source).y;
  const horizontal = Math.abs(dx) / (source.width + target.width) >= Math.abs(dy) / (source.height + target.height);
  const sourceSide = horizontal ? (dx >= 0 ? Side.Right : Side.Left) : dy >= 0 ? Side.Bottom : Side.Top;
  const targetSide = OPPOSITE[sourceSide];
  const from = sideMiddle(source, sourceSide);
  const to = sideMiddle(target, targetSide);
  return { sourceX: from.x, sourceY: from.y, sourcePosition: sourceSide, targetX: to.x, targetY: to.y, targetPosition: targetSide };
}

const OPPOSITE: Record<Side, Side> = {
  [Side.Left]: Side.Right,
  [Side.Right]: Side.Left,
  [Side.Top]: Side.Bottom,
  [Side.Bottom]: Side.Top,
};

function center(r: Rect) {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

function sideMiddle(r: Rect, side: Side) {
  switch (side) {
    case Side.Left:
      return { x: r.x, y: r.y + r.height / 2 };
    case Side.Right:
      return { x: r.x + r.width, y: r.y + r.height / 2 };
    case Side.Top:
      return { x: r.x + r.width / 2, y: r.y };
    case Side.Bottom:
      return { x: r.x + r.width / 2, y: r.y + r.height };
  }
}
