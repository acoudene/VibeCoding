import * as Y from "yjs";
import type { BoardHistory } from "../../application/ports/board-history";
import { boardDocTypes, LOCAL_ORIGIN } from "./board-doc-schema";

/**
 * Historique d'un `Y.Doc` de tableau (FR-044) : `Y.UndoManager` limité aux transactions d'origine
 * locale. `captureTimeout: 0` : deux actions, même enchaînées sans délai, restent deux étapes.
 * Ne suit que les modifications postérieures à sa création.
 */
export class YjsBoardHistory implements BoardHistory {
  private readonly undoManager: Y.UndoManager;

  constructor(doc: Y.Doc) {
    const { meta, stickies, links, frames } = boardDocTypes(doc);
    this.undoManager = new Y.UndoManager([meta, stickies, links, frames], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 0,
    });
  }

  /** Origine des transactions d'annulation et de rétablissement. */
  get origin(): unknown {
    return this.undoManager;
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /** Cesse de suivre le document (avant d'en ouvrir un autre). */
  destroy(): void {
    this.undoManager.destroy();
  }
}
