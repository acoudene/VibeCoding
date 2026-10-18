import type { EditStickyCommand } from "../../../application/board/edit-sticky";
import { STICKY_KINDS } from "../../../domain/board/sticky-kind";
import { editExistingSticky } from "../canvas/board-gestures";
import { linkAnomaly } from "../canvas/link-edges";
import { useBoard } from "../hooks/use-board";
import { useServices } from "../services";
import { STICKY_KIND_NAMES } from "../sticky-kinds";
import "./panels.css";
import type { SelectedElement } from "./selection";

export interface SelectionPanelProps {
  readonly selection: SelectedElement;
  /** Passe le nom du cadre en édition sur le canevas. */
  readonly onRenameFrame: (frameId: string) => void;
}

/** Panneau contextuel de l'élément sélectionné (FR-014, FR-024, FR-032) : chaque action passe par un cas d'usage. */
export function SelectionPanel({ selection, onRenameFrame }: SelectionPanelProps) {
  switch (selection.kind) {
    case "sticky":
      return <StickyPanel key={selection.id} id={selection.id} />;
    case "link":
      return <LinkPanel id={selection.id} />;
    case "frame":
      return <FramePanel id={selection.id} onRename={() => onRenameFrame(selection.id)} />;
  }
}

/** Type, identifiant (anglais), notes, supprimer. Identifiant et notes sont enregistrés en quittant le champ. */
function StickyPanel({ id }: { id: string }) {
  const sticky = useBoard().sticky(id);
  const { editSticky, deleteSelection, currentBoard } = useServices();
  if (sticky === undefined) return null;
  const edit = (command: EditStickyCommand) => editExistingSticky({ board: currentBoard(), editSticky }, command);
  const identifier = sticky.identifier ?? "";
  return (
    <section className="selection-panel" aria-label="Post-it sélectionné">
      <label className="selection-panel__field">
        Type
        <select
          value={sticky.kind}
          onChange={(event) => {
            const kind = STICKY_KINDS.find((k) => k === event.target.value);
            if (kind !== undefined) edit({ id, kind });
          }}
        >
          {STICKY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {STICKY_KIND_NAMES[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className="selection-panel__field">
        Identifiant (anglais)
        <input
          key={identifier}
          lang="en"
          spellCheck={false}
          placeholder="ex. OrderPlaced"
          defaultValue={identifier}
          onBlur={(event) => {
            if (event.currentTarget.value !== identifier) edit({ id, identifier: event.currentTarget.value });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      <label className="selection-panel__field">
        Notes
        <textarea
          key={sticky.notes}
          rows={4}
          defaultValue={sticky.notes}
          onBlur={(event) => {
            if (event.currentTarget.value !== sticky.notes) edit({ id, notes: event.currentTarget.value });
          }}
        />
      </label>
      <button type="button" className="selection-panel__danger" onClick={() => deleteSelection.execute({ stickyIds: [id] })}>
        Supprimer le post-it
      </button>
    </section>
  );
}

/** Inverser le sens, supprimer ; rappelle la règle attendue d'un lien hors grammaire. */
function LinkPanel({ id }: { id: string }) {
  const board = useBoard();
  const { editLink } = useServices();
  const link = board.link(id);
  if (link === undefined) return null;
  const anomaly = linkAnomaly(board, link);
  return (
    <section className="selection-panel" aria-label="Lien sélectionné">
      {anomaly !== null && <p className="selection-panel__warning">{anomaly}</p>}
      <button type="button" onClick={() => editLink.execute({ linkId: id, action: "reverse" })}>
        Inverser le sens
      </button>
      <button type="button" className="selection-panel__danger" onClick={() => editLink.execute({ linkId: id, action: "remove" })}>
        Supprimer le lien
      </button>
    </section>
  );
}

/** Renommer (édition en place du titre), supprimer : les post-its du cadre restent sur le tableau. */
function FramePanel({ id, onRename }: { id: string; onRename: () => void }) {
  const frame = useBoard().frames.find((f) => f.id === id);
  const { editFrame } = useServices();
  if (frame === undefined) return null;
  return (
    <section className="selection-panel" aria-label="Cadre sélectionné">
      <button type="button" onClick={onRename}>
        Renommer le cadre
      </button>
      <button type="button" className="selection-panel__danger" onClick={() => editFrame.execute({ frameId: id, action: "remove" })}>
        Supprimer le cadre
      </button>
    </section>
  );
}
