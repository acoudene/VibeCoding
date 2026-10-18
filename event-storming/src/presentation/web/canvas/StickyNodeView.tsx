import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { stickyColorVar } from "../sticky-kinds";
import { stickyFontSize } from "./sticky-font";
import { useStickyEditing } from "./sticky-editing";
import type { StickyNode } from "./sticky-nodes";

/** Les 4 points de connexion (FR-020) ; en mode de connexion « souple », chacun peut commencer ou recevoir un lien. */
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left] as const;

/**
 * Post-it : couleur dérivée du type, taille fixe (FR-011, FR-017), texte édité en place (FR-013),
 * 4 points de connexion visibles au survol ou à la sélection (FR-020).
 */
export const StickyNodeView = memo(function StickyNodeView({ id, data }: NodeProps<StickyNode>) {
  return (
    <div className="sticky-node" style={{ background: stickyColorVar(data.color) }} data-kind={data.kind}>
      {data.editing ? <StickyTextEditor id={id} initialLabel={data.label} /> : <StickyText label={data.label} />}
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} className="sticky-node__handle" />
      ))}
    </div>
  );
});

function StickyText({ label }: { label: string }) {
  return (
    <p className="sticky-node__text" style={{ fontSize: stickyFontSize(label) }}>
      {label}
    </p>
  );
}

/** `nodrag nopan nowheel` : la saisie ne déplace ni le post-it ni la vue. Échap ou un clic ailleurs termine l'édition. */
function StickyTextEditor({ id, initialLabel }: { id: string; initialLabel: string }) {
  const { finishEditing } = useStickyEditing();
  const [draft, setDraft] = useState(initialLabel);
  return (
    <textarea
      className="sticky-node__editor nodrag nopan nowheel"
      aria-label="Texte du post-it"
      autoFocus
      value={draft}
      style={{ fontSize: stickyFontSize(draft) }}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.setSelectionRange(draft.length, draft.length)}
      onBlur={() => finishEditing(id, draft)}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.currentTarget.blur();
      }}
    />
  );
}
