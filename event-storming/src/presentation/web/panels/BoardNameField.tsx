import { useState } from "react";
import { useBoard } from "../hooks/use-board";
import { useServices } from "../services";
import { commitBoardName } from "./board-name";
import "./panels.css";

/** Nom du tableau, modifiable dans l'en-tête (FR-006) ; un nom refusé par le domaine affiche son message. */
export function BoardNameField() {
  const { name } = useBoard();
  // Remonté à chaque changement de nom (y compris venu d'ailleurs : annuler, autre onglet).
  return <BoardNameInput key={name} name={name} />;
}

function BoardNameInput({ name }: { name: string }) {
  const { renameBoard, currentBoard } = useServices();
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | undefined>();
  function commit() {
    const message = commitBoardName(renameBoard, draft);
    setError(message);
    if (message === undefined) setDraft(currentBoard().name);
  }
  return (
    <>
      <h1 className="board-name">
        <input
          className="board-name__input"
          aria-label="Nom du tableau"
          aria-invalid={error !== undefined}
          aria-describedby={error === undefined ? undefined : "board-name-error"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(name);
              setError(undefined);
            }
          }}
        />
      </h1>
      {error !== undefined && (
        <p id="board-name-error" className="board-name__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
