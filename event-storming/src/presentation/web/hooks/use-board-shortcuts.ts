import { useEffect, useLayoutEffect, useRef } from "react";
import { boardShortcut, isTyping, type BoardShortcut } from "../canvas/board-shortcuts";

export type BoardShortcutActions = Readonly<Record<BoardShortcut, () => void>>;

/**
 * Raccourcis clavier du tableau (FR-041 à FR-044), écoutés sur la fenêtre ; inactifs pendant une saisie de texte.
 * Les actions les plus récentes sont appelées (elles lisent la sélection du moment), sans réabonnement à chaque rendu.
 */
export function useBoardShortcuts(actions: BoardShortcutActions): void {
  const latest = useRef(actions);
  useLayoutEffect(() => {
    latest.current = actions;
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return;
      const shortcut = boardShortcut(event);
      if (shortcut === undefined) return;
      event.preventDefault(); // ex. Ctrl+D ne doit pas ajouter un favori
      latest.current[shortcut]();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
