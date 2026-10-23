import type { OpenBoardCommand, OpenBoardOptions, OpenBoardResult } from "../../../application/board/open-board";
import { BoardNotFoundError } from "../../../application/ports/board-gateway";
import type { BoardSync, SyncStatus } from "../../../application/ports/board-sync";
import type { BoardId } from "../../../domain/board/board";
import { shouldWarnBeforeUnload, type PageExit } from "./page-exit";

export type BoardSessionState =
  | { readonly phase: "loading" }
  | { readonly phase: "notFound" }
  | { readonly phase: "failed" }
  | { readonly phase: "open" };

export interface OpenBoardPort {
  execute(command: OpenBoardCommand, options: OpenBoardOptions): Promise<OpenBoardResult | undefined>;
}

export interface BoardSessionDeps {
  readonly openBoard: OpenBoardPort;
  readonly startSync: (id: BoardId) => BoardSync;
  /** Fermeture, mise en arrière-plan et sortie de la page. */
  readonly page: PageExit;
  /** Valide le texte en cours de saisie (post-it, panneau, nom du tableau ou d'un cadre), enregistré sinon au blur. */
  readonly commitOpenEditor: () => void;
}

export interface BoardSessionListener {
  onState(state: BoardSessionState): void;
  onSyncStatus(status: SyncStatus): void;
}

/**
 * Ouvre le tableau puis le synchronise jusqu'à la fermeture de la session (fonction renvoyée).
 * Une ouverture qui aboutit après la fermeture est obsolète : rien n'est chargé (`OpenBoard`), ni synchronisation
 * ni état.
 */
export function startBoardSession(deps: BoardSessionDeps, id: string, listener: BoardSessionListener): () => void {
  let closed = false;
  let disconnect: (() => void) | undefined;
  listener.onState({ phase: "loading" });
  deps.openBoard
    .execute({ id }, { isCurrent: () => !closed })
    .then((opened) => {
      if (closed || opened === undefined) return;
      disconnect = connectSync(deps, opened.id, listener);
      listener.onState({ phase: "open" });
    })
    .catch((error: unknown) => {
      if (!closed) listener.onState({ phase: error instanceof BoardNotFoundError ? "notFound" : "failed" });
    });
  return () => {
    closed = true;
    disconnect?.();
  };
}

/**
 * Page masquée ou fermée : le texte en cours de saisie est validé, puis tout ce qui n'est pas confirmé est confié au
 * navigateur (`flushWithBeacon`). Avant de quitter : même validation, puis confirmation si rien n'est garanti.
 * `stop()` abandonne les envois en attente : on les confie d'abord au navigateur.
 */
function connectSync(deps: BoardSessionDeps, id: BoardId, listener: BoardSessionListener): () => void {
  const sync = deps.startSync(id);
  const unsubscribe = sync.onStatusChange((status) => listener.onSyncStatus(status));
  const stopListeningHidden = deps.page.onHidden(() => {
    deps.commitOpenEditor();
    sync.flushWithBeacon();
  });
  const stopListeningUnload = deps.page.onBeforeUnload(() => {
    deps.commitOpenEditor();
    return shouldWarnBeforeUnload(sync.status());
  });
  listener.onSyncStatus(sync.status());
  return () => {
    stopListeningHidden();
    stopListeningUnload();
    unsubscribe();
    sync.flushWithBeacon();
    sync.stop();
  };
}
