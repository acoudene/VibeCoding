import { useEffect, useState } from "react";
import { BoardNotFoundError } from "../../../application/ports/board-gateway";
import type { SyncStatus } from "../../../application/ports/board-sync";
import { navigate } from "../navigation";
import { useServices } from "../services";

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "notFound" }
  | { readonly phase: "failed" }
  | { readonly phase: "open"; readonly name: string };

const SYNC_LABELS: Record<SyncStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement…",
  offline: "Hors ligne",
  error: "Erreur d'enregistrement",
};

/** Page d'un tableau. Emplacement provisoire : U12 y installe le canevas ; l'ouverture et la synchronisation restent ici. */
export function BoardPage({ id }: { id: string }) {
  const { openBoard, startSync } = useServices();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [sync, setSync] = useState<SyncStatus>("saved");

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    let flush: (() => void) | undefined;
    openBoard
      .execute({ id })
      .then((opened) => {
        if (cancelled) return;
        const boardSync = startSync(opened.id);
        const unsubscribe = boardSync.onStatusChange(setSync);
        const onPageHide = () => boardSync.flushWithBeacon();
        window.addEventListener("pagehide", onPageHide);
        flush = onPageHide;
        stop = () => {
          unsubscribe();
          boardSync.stop();
        };
        setSync(boardSync.status());
        setState({ phase: "open", name: opened.name });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ phase: error instanceof BoardNotFoundError ? "notFound" : "failed" });
      });
    return () => {
      cancelled = true;
      if (flush !== undefined) window.removeEventListener("pagehide", flush);
      stop?.();
    };
  }, [id, openBoard, startSync]);

  return (
    <main>
      <a
        href="/"
        onClick={(event) => {
          event.preventDefault();
          navigate("/");
        }}
      >
        Accueil
      </a>
      {state.phase === "loading" && <p>Chargement…</p>}
      {state.phase === "notFound" && <h1>Tableau introuvable</h1>}
      {state.phase === "failed" && <p role="alert">Impossible d'ouvrir le tableau.</p>}
      {state.phase === "open" && (
        <>
          <h1>{state.name}</h1>
          <p aria-live="polite">{SYNC_LABELS[sync]}</p>
        </>
      )}
    </main>
  );
}
