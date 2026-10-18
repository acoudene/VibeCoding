import type { StickyKind } from "../../../domain/board/sticky-kind";
import { stickyColorVar, stickyKindItems } from "../sticky-kinds";

export interface PaletteProps {
  readonly activeKind: StickyKind | undefined;
  /** `undefined` : plus aucun type actif (nouveau clic sur le type actif). */
  readonly onSelect: (kind: StickyKind | undefined) => void;
}

const ITEMS = stickyKindItems();

/** Palette des 9 types : on choisit un type, jamais une couleur (FR-010, ADR-0016). */
export function Palette({ activeKind, onSelect }: PaletteProps) {
  return (
    <div className="palette" role="toolbar" aria-label="Types de post-it" aria-orientation="vertical">
      {ITEMS.map((item) => (
        <button
          key={item.kind}
          type="button"
          className="palette__button"
          aria-pressed={item.kind === activeKind}
          onClick={() => onSelect(item.kind === activeKind ? undefined : item.kind)}
        >
          <span className="swatch" style={{ background: stickyColorVar(item.color) }} aria-hidden="true" />
          {item.name}
        </button>
      ))}
    </div>
  );
}
