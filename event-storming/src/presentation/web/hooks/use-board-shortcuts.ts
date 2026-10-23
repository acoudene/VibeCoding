import { useEffect, useLayoutEffect, useRef } from "react";
import { handleBoardKey, isTyping, type BoardShortcutActions } from "../canvas/board-shortcuts";

/**
 * Raccourcis clavier du tableau (FR-041 à FR-044), écoutés sur la fenêtre ; inactifs pendant une saisie de texte.
 * Les actions les plus récentes sont appelées (elles lisent la sélection du moment), sans réabonnement à chaque rendu.
 * L'action du navigateur n'est empêchée que si le raccourci a été traité.
 */
export function useBoardShortcuts(actions: BoardShortcutActions): void {
  const latest = useRef(actions);
  useLayoutEffect(() => {
    latest.current = actions;
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (handleBoardKey(event, isTyping(event.target), latest.current)) event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
