import { useEffect, useState } from "react";
import type { SyncStatus } from "../../../application/ports/board-sync";
import { useServices } from "../services";
import { startBoardSession, type BoardSessionState } from "./board-session";
import { browserPageExit, commitFocusedEditor } from "./page-exit";

export interface BoardSessionView {
  readonly session: BoardSessionState;
  readonly sync: SyncStatus;
}

/** Ouvre le tableau `id` et le synchronise tant que le composant est monté (voir `startBoardSession`). */
export function useBoardSession(id: string): BoardSessionView {
  const { openBoard, startSync } = useServices();
  const [session, setSession] = useState<BoardSessionState>({ phase: "loading" });
  const [sync, setSync] = useState<SyncStatus>("saved");
  useEffect(
    () =>
      startBoardSession({ openBoard, startSync, page: browserPageExit, commitOpenEditor: commitFocusedEditor }, id, {
        onState: setSession,
        onSyncStatus: setSync,
      }),
    [id, openBoard, startSync],
  );
  return { session, sync };
}
