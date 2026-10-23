import { stickyColorVar, stickyKindItems } from "../sticky-kinds";
import "./legend.css";

const ITEMS = stickyKindItems();

/** Légende fixe, toujours visible : couleur et nom français de chaque type ; le violet est « Policy » (FR-016). */
export function Legend() {
  return (
    <aside className="legend" aria-label="Légende">
      <h2 className="legend__title">Légende</h2>
      <ul className="legend__list">
        {ITEMS.map((item) => (
          <li key={item.kind} className="legend__row">
            <span className="swatch" style={{ background: stickyColorVar(item.color) }} aria-hidden="true" />
            {item.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}
