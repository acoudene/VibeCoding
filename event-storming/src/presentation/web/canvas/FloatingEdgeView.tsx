import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps, type InternalNode } from "@xyflow/react";
import { memo } from "react";
import type { Rect } from "../../../domain/board/geometry";
import { STICKY_SIZE } from "../../../domain/board/sticky";
import { floatingEdgeEnds } from "./floating-edge";
import type { LinkEdge } from "./link-edges";

/**
 * Lien flottant (FR-020 à FR-022) : accroché au côté de chaque post-it tourné vers l'autre, recalculé depuis les
 * positions affichées (il suit donc un post-it pendant son glissement), flèche à l'arrivée, info-bulle si hors grammaire.
 */
export const FloatingEdgeView = memo(function FloatingEdgeView({ id, source, target, markerEnd, data }: EdgeProps<LinkEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (sourceNode === undefined || targetNode === undefined) return null;
  const [path] = getBezierPath(floatingEdgeEnds(rectOf(sourceNode), rectOf(targetNode)));
  const anomaly = data?.anomaly ?? null;
  return (
    <g>
      {anomaly !== null && <title>{anomaly}</title>}
      <BaseEdge id={id} path={path} {...(markerEnd === undefined ? {} : { markerEnd })} />
    </g>
  );
});

function rectOf(node: InternalNode): Rect {
  return {
    ...node.internals.positionAbsolute,
    width: node.measured.width ?? STICKY_SIZE.width,
    height: node.measured.height ?? STICKY_SIZE.height,
  };
}
