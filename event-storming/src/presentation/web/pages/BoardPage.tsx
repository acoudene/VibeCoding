import type { SyncStatus } from "../../../application/ports/board-sync";
import { BoardEditor } from "../canvas/BoardEditor";
import { useBoard } from "../hooks/use-board";
import { useBoardSession } from "../hooks/use-board-session";
import { followLink } from "../navigation";
import "./board-page.css";

const SYNC_LABELS: Record<SyncStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement…",
  offline: "Hors ligne",
  error: "Erreur d'enregistrement",
};

/** Page d'un tableau : ouverture et synchronisation (`useBoardSession`), puis espace de travail. */
export function BoardPage({ id }: { id: string }) {
  const { session, sync } = useBoardSession(id);
  return (
    <main className="board-page">
      <header className="board-page__header">
        <a href="/" onClick={followLink("/")}>
          Accueil
        </a>
        {session.phase === "loading" && <p>Chargement…</p>}
        {session.phase === "notFound" && <h1>Tableau introuvable</h1>}
        {session.phase === "failed" && <p role="alert">Impossible d'ouvrir le tableau.</p>}
        {session.phase === "open" && <BoardTitle />}
        {session.phase === "open" && <p aria-live="polite">{SYNC_LABELS[sync]}</p>}
      </header>
      {session.phase === "open" && <BoardEditor />}
    </main>
  );
}

function BoardTitle() {
  const { name } = useBoard();
  return <h1 className="board-page__title">{name}</h1>;
}
