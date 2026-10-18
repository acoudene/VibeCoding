import type { Unsubscribe } from "../../../application/ports/board-store";
import type { SyncStatus } from "../../../application/ports/board-sync";

/** Fin de vie de la page vue par la session du tableau (US-6 : aucune perte silencieuse). */
export interface PageExit {
  /** Page fermée (`pagehide`) ou passée en arrière-plan (`visibilitychange` → `hidden`), qui peut ne jamais revenir. */
  onHidden(listener: () => void): Unsubscribe;
  /** Avant de quitter la page (`beforeunload`) : le gestionnaire renvoie `true` pour demander confirmation. */
  onBeforeUnload(listener: () => boolean): Unsubscribe;
}

/**
 * Prévenir avant de quitter tant que tout n'est pas enregistré. Un texte en cours de saisie est d'abord validé
 * (`commitOpenEditor`) : s'il change le tableau, la synchronisation passe « Enregistrement… » et l'on prévient.
 */
export function shouldWarnBeforeUnload(status: SyncStatus): boolean {
  return status !== "saved";
}

/** Champs de saisie dont le texte n'est enregistré qu'en les quittant : texte du post-it, panneau, noms. */
const TEXT_EDITOR = "input, textarea";

export interface FocusedElement {
  matches(selector: string): boolean;
  blur(): void;
}

/** Valide le champ de saisie ouvert en le quittant : son gestionnaire `onBlur` enregistre le texte, sans attendre. */
export function commitOpenEditor(active: FocusedElement | null): void {
  if (active !== null && active.matches(TEXT_EDITOR)) active.blur();
}

/** Valide le champ de saisie qui a le focus dans le document. */
export function commitFocusedEditor(): void {
  const active = document.activeElement;
  commitOpenEditor(active instanceof HTMLElement ? active : null);
}

/** `PageExit` du navigateur. */
export const browserPageExit: PageExit = {
  onHidden(listener) {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") listener();
    };
    window.addEventListener("pagehide", listener);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", listener);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  },
  onBeforeUnload(listener) {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!listener()) return;
      event.preventDefault();
      // Navigateurs plus anciens : une valeur de retour non vide déclenche aussi la confirmation.
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  },
};
