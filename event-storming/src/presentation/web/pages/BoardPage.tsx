import { BoardEditor } from "../canvas/BoardEditor";
import { useBoardSession } from "../hooks/use-board-session";
import { followLink } from "../navigation";
import { BoardNameField } from "../panels/BoardNameField";
import { HistoryButtons } from "../panels/HistoryButtons";
import { SaveIndicator } from "../panels/SaveIndicator";
import "./board-page.css";

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
        {session.phase === "open" && <BoardNameField />}
        {session.phase === "open" && <HistoryButtons />}
        {session.phase === "open" && <SaveIndicator status={sync} />}
      </header>
      {session.phase === "open" && <BoardEditor />}
    </main>
  );
}
