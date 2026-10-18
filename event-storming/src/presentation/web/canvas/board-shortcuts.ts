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

/** Actions des raccourcis ; chacune renvoie vrai si elle a traité la touche (le navigateur ne doit alors rien faire). */
export type BoardShortcutActions = Readonly<Record<BoardShortcut, () => boolean>>;

/**
 * Exécute le raccourci de la touche, sauf pendant une saisie de texte. Renvoie vrai si la touche a été traitée :
 * l'appelant empêche alors l'action du navigateur (ex. `Ctrl+D` = favori). Sans sélection ni presse-papiers,
 * `Ctrl+C` / `Ctrl+V` gardent leur comportement natif (copier le texte de la page).
 */
export function handleBoardKey(event: ShortcutKey, typing: boolean, actions: BoardShortcutActions): boolean {
  if (typing) return false;
  const shortcut = boardShortcut(event);
  return shortcut === undefined ? false : actions[shortcut]();
}

/**
 * Après un clic de souris (`detail` > 0) sur un bouton, le focus lui est retiré : sinon `Espace`, maintenu pour
 * déplacer la vue (FR-050), réactiverait ce bouton. Une activation au clavier (`detail` = 0) garde le focus.
 */
export function releasesFocusAfterClick(click: { readonly isButton: boolean; readonly clickCount: number }): boolean {
  return click.isButton && click.clickCount > 0;
}

/** Vrai si la touche est tapée dans un champ de saisie : elle ne doit alors déclencher aucun outil ni raccourci. */
export function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}
