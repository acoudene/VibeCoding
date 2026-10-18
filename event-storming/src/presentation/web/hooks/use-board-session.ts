import { useEffect, useState } from "react";
import type { Unsubscribe } from "../../../application/ports/board-store";
import type { SyncStatus } from "../../../application/ports/board-sync";
import { useServices } from "../services";
import { startBoardSession, type BoardSessionState } from "./board-session";

export interface BoardSessionView {
  readonly session: BoardSessionState;
  readonly sync: SyncStatus;
}

function onPageHide(listener: () => void): Unsubscribe {
  window.addEventListener("pagehide", listener);
  return () => window.removeEventListener("pagehide", listener);
}

/** Ouvre le tableau `id` et le synchronise tant que le composant est monté (voir `startBoardSession`). */
export function useBoardSession(id: string): BoardSessionView {
  const { openBoard, startSync } = useServices();
  const [session, setSession] = useState<BoardSessionState>({ phase: "loading" });
  const [sync, setSync] = useState<SyncStatus>("saved");
  useEffect(
    () => startBoardSession({ openBoard, startSync, onPageHide }, id, { onState: setSession, onSyncStatus: setSync }),
    [id, openBoard, startSync],
  );
  return { session, sync };
}
