import { useState } from "react";
import { followLink, navigate } from "../navigation";
import { toRecentBoardRows } from "../recent-boards-view";
import { boardPath } from "../routes";
import { useServices } from "../services";

export function Home() {
  const { createBoard, listRecentBoards, forgetRecentBoard } = useServices();
  const [recent, setRecent] = useState(() => toRecentBoardRows(listRecentBoards.execute()));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function create() {
    setCreating(true);
    setError(undefined);
    try {
      const { id } = await createBoard.execute();
      navigate(boardPath(id));
    } catch {
      setError("Impossible de créer le tableau. Réessayez.");
      setCreating(false);
    }
  }

  function forget(id: string) {
    forgetRecentBoard.execute({ id });
    setRecent(toRecentBoardRows(listRecentBoards.execute()));
  }

  return (
    <main>
      <h1>Event Storming</h1>
      <button type="button" onClick={() => void create()} disabled={creating}>
        Nouveau tableau
      </button>
      {error !== undefined && <p role="alert">{error}</p>}
      <h2>Tableaux récents</h2>
      {recent.length === 0 ? (
        <p>Aucun tableau ouvert dans ce navigateur.</p>
      ) : (
        <ul aria-label="Tableaux récents">
          {recent.map((row) => (
            <li key={row.id}>
              <a href={row.href} onClick={followLink(row.href)}>
                {row.name}
              </a>{" "}
              <time dateTime={row.openedAtIso}>{row.openedAtLabel}</time>{" "}
              <button type="button" onClick={() => forget(row.id)} aria-label={`Retirer ${row.name} de la liste`}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
