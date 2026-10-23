import { MarkerType, type Edge } from "@xyflow/react";
import type { Board } from "../../../domain/board/board";
import { describeExpectedLinks } from "../../../domain/board/grammar";
import type { Link } from "../../../domain/board/link";
import { STICKY_KIND_NAMES } from "../sticky-kinds";
import { LINK_Z_INDEX } from "./layers";

export type LinkEdgeData = {
  /** Info-bulle d'un lien hors grammaire (FR-022), `null` pour un lien conforme. */
  readonly anomaly: string | null;
};

export type LinkEdge = Edge<LinkEdgeData, "floating">;

/** Couleurs du trait et de la flèche ; doivent correspondre à `.link-edge` dans `board-editor.css`. */
const LINK_COLOR = "#495057";
const OUT_OF_GRAMMAR_COLOR = "#e03131";

/**
 * Arêtes xyflow des liens, dans l'ordre du tableau : une arête flottante fléchée par lien, au style distinct et
 * avec info-bulle quand le lien est hors grammaire. La sélection des arêtes existantes est conservée ;
 * une arête inchangée est réutilisée telle quelle.
 */
export function syncLinkEdges(previous: readonly LinkEdge[], board: Board): LinkEdge[] {
  const previousById = new Map(previous.map((edge) => [edge.id, edge]));
  return board.links.map((link) => {
    const edge = previousById.get(link.id);
    const anomaly = linkAnomaly(board, link);
    const ariaLabel = describe(board, link, anomaly);
    if (
      edge !== undefined &&
      edge.source === link.sourceId &&
      edge.target === link.targetId &&
      edge.data?.anomaly === anomaly &&
      edge.ariaLabel === ariaLabel
    ) {
      return edge;
    }
    const color = anomaly === null ? LINK_COLOR : OUT_OF_GRAMMAR_COLOR;
    return {
      id: link.id,
      source: link.sourceId,
      target: link.targetId,
      type: "floating",
      zIndex: LINK_Z_INDEX,
      selected: edge?.selected ?? false,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      className: anomaly === null ? "link-edge" : "link-edge link-edge--out-of-grammar",
      ariaLabel,
      data: { anomaly },
    };
  });
}

/** Info-bulle d'un lien hors grammaire citant la règle attendue depuis le type source (FR-022) ; `null` si conforme. */
export function linkAnomaly(board: Board, link: Link): string | null {
  if (!board.isOutOfGrammar(link)) return null;
  const sourceKind = kindOf(board, link.sourceId);
  const expected = describeExpectedLinks(sourceKind);
  return expected === ""
    ? `Lien hors grammaire — aucun lien attendu depuis ${sourceKind}`
    : `Lien hors grammaire — attendu : ${expected}`;
}

function describe(board: Board, link: Link, anomaly: string | null): string {
  const source = STICKY_KIND_NAMES[kindOf(board, link.sourceId)];
  const target = STICKY_KIND_NAMES[kindOf(board, link.targetId)];
  return `Lien ${source} → ${target}${anomaly === null ? "" : " (hors grammaire)"}`;
}

/** Les extrémités d'un lien existent toujours (invariant du tableau, vérifié aussi par `isOutOfGrammar`). */
function kindOf(board: Board, stickyId: string) {
  const sticky = board.sticky(stickyId);
  if (sticky === undefined) throw new Error(`Extrémité de lien introuvable : ${stickyId}`);
  return sticky.kind;
}
