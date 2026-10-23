import { useEffect } from "react";
import { releasesFocusAfterClick } from "../canvas/board-shortcuts";

/**
 * Retire le focus d'un bouton cliqué à la souris (palette, zoom, annuler…) : `Espace` + glisser ne le réactive pas
 * (FR-050). Une activation au clavier garde le focus (accessibilité).
 */
export function useReleaseButtonFocus(): void {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (button === null || button !== document.activeElement) return;
      if (releasesFocusAfterClick({ isButton: true, clickCount: event.detail })) button.blur();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
