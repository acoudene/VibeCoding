import type { EditFrameCommand } from "../../../application/board/edit-frame";
import type { EditStickyCommand } from "../../../application/board/edit-sticky";
import type { LinkStickiesCommand, LinkStickiesResult } from "../../../application/board/link-stickies";
import type { MoveStickyCommand } from "../../../application/board/move-sticky";
import type { Board } from "../../../domain/board/board";
import { EmptyFrameNameError } from "../../../domain/board/errors";
import type { Position } from "../../../domain/board/geometry";

/**
 * Traduction des gestes du canevas en cas d'usage. `board` est le tableau au moment du geste : il sert à ignorer
 * un geste devenu sans objet (élément supprimé entre-temps), jamais à modifier l'état.
 */
export interface UseCase<Command, Result = void> {
  execute(command: Command): Result;
}

/** Modifie un post-it, sauf s'il n'existe plus (ex. supprimé depuis le panneau pendant l'édition de son texte). */
export function editExistingSticky(
  deps: { readonly board: Board; readonly editSticky: UseCase<EditStickyCommand> },
  command: EditStickyCommand,
): void {
  if (deps.board.sticky(command.id) === undefined) return;
  deps.editSticky.execute(command);
}

/** Relie deux post-its (FR-020) ; une connexion vers soi-même (refusée par le domaine) ou hors post-it est ignorée. */
export function connectStickies(
  deps: { readonly board: Board; readonly linkStickies: UseCase<LinkStickiesCommand, LinkStickiesResult> },
  sourceId: string,
  targetId: string,
): LinkStickiesResult | undefined {
  if (sourceId === targetId) return undefined;
  if (deps.board.sticky(sourceId) === undefined || deps.board.sticky(targetId) === undefined) return undefined;
  return deps.linkStickies.execute({ sourceId, targetId });
}

export interface DraggedNode {
  readonly id: string;
  readonly type?: string | undefined;
  readonly position: Position;
}

/**
 * Enregistre la fin d'un glissement : les cadres d'abord, déplacés de leur décalage (leurs membres suivent, par le
 * domaine), puis les post-its glissés à leur position finale (un membre glissé avec son cadre finit donc à sa place).
 */
export function commitDrag(
  deps: {
    readonly board: Board;
    readonly moveSticky: UseCase<MoveStickyCommand>;
    readonly editFrame: UseCase<EditFrameCommand>;
  },
  dragged: readonly DraggedNode[],
): void {
  for (const node of dragged) {
    if (node.type !== "frame") continue;
    const frame = deps.board.frames.find((f) => f.id === node.id);
    if (frame === undefined) continue;
    const dx = node.position.x - frame.rect.x;
    const dy = node.position.y - frame.rect.y;
    if (dx !== 0 || dy !== 0) deps.editFrame.execute({ frameId: node.id, action: "move", dx, dy });
  }
  for (const node of dragged) {
    if (node.type === "sticky" && deps.board.sticky(node.id) !== undefined) {
      deps.moveSticky.execute({ id: node.id, to: node.position });
    }
  }
}

/** Renomme un cadre ; un nom vide, refusé par le domaine, laisse l'ancien nom ; un cadre disparu est ignoré. */
export function renameFrame(
  deps: { readonly board: Board; readonly editFrame: UseCase<EditFrameCommand> },
  frameId: string,
  name: string,
): void {
  if (!deps.board.frames.some((f) => f.id === frameId)) return;
  try {
    deps.editFrame.execute({ frameId, action: "rename", name });
  } catch (error) {
    if (!(error instanceof EmptyFrameNameError)) throw error;
  }
}
