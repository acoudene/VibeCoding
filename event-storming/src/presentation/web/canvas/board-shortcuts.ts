/** Action déclenchée au clavier sur le tableau (FR-041 à FR-044). */
export type BoardShortcut = "delete" | "duplicate" | "copy" | "paste" | "undo" | "redo";

export interface ShortcutKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

/**
 * Raccourci correspondant à la touche : `Suppr` / `Retour arrière` sans modificateur ; `Ctrl` (ou `Cmd`) + `D`, `C`,
 * `V`, `Z`, `Y` ; `Ctrl+Maj+Z` rétablit. Toute combinaison avec `Alt` est laissée au navigateur.
 */
export function boardShortcut(event: ShortcutKey): BoardShortcut | undefined {
  if (event.altKey) return undefined;
  const command = event.ctrlKey || event.metaKey;
  if (!command) return event.key === "Delete" || event.key === "Backspace" ? "delete" : undefined;
  switch (event.key.toLowerCase()) {
    case "d":
      return "duplicate";
    case "c":
      return "copy";
    case "v":
      return "paste";
    case "z":
      return event.shiftKey ? "redo" : "undo";
    case "y":
      return "redo";
    default:
      return undefined;
  }
}

/** Vrai si la touche est tapée dans un champ de saisie : elle ne doit alors déclencher aucun outil ni raccourci. */
export function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}
