import type { OpenBoardCommand, OpenBoardResult } from "../../../application/board/open-board";
import { BoardNotFoundError } from "../../../application/ports/board-gateway";
import type { Unsubscribe } from "../../../application/ports/board-store";
import type { BoardSync, SyncStatus } from "../../../application/ports/board-sync";
import type { BoardId } from "../../../domain/board/board";

export type BoardSessionState =
  | { readonly phase: "loading" }
  | { readonly phase: "notFound" }
  | { readonly phase: "failed" }
  | { readonly phase: "open" };

export interface OpenBoardPort {
  execute(command: OpenBoardCommand): Promise<OpenBoardResult>;
}

export interface BoardSessionDeps {
  readonly openBoard: OpenBoardPort;
  readonly startSync: (id: BoardId) => BoardSync;
  /** Abonnement à la fermeture de la page (`pagehide`). */
  readonly onPageHide: (listener: () => void) => Unsubscribe;
}

export interface BoardSessionListener {
  onState(state: BoardSessionState): void;
  onSyncStatus(status: SyncStatus): void;
}

/**
 * Ouvre le tableau puis le synchronise jusqu'à la fermeture de la session (fonction renvoyée).
 * Une ouverture qui aboutit après la fermeture est ignorée : ni synchronisation ni état.
 */
export function startBoardSession(deps: BoardSessionDeps, id: string, listener: BoardSessionListener): () => void {
  let closed = false;
  let disconnect: (() => void) | undefined;
  listener.onState({ phase: "loading" });
  deps.openBoard
    .execute({ id })
    .then((opened) => {
      if (closed) return;
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

/** `stop()` abandonne les envois en attente : on les confie d'abord au navigateur (`flushWithBeacon`). */
function connectSync(deps: BoardSessionDeps, id: BoardId, listener: BoardSessionListener): () => void {
  const sync = deps.startSync(id);
  const unsubscribe = sync.onStatusChange((status) => listener.onSyncStatus(status));
  const stopListeningPage = deps.onPageHide(() => sync.flushWithBeacon());
  listener.onSyncStatus(sync.status());
  return () => {
    stopListeningPage();
    unsubscribe();
    sync.flushWithBeacon();
    sync.stop();
  };
}
