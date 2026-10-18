export interface ClickModifiers {
  readonly button: number;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

/** Seul un clic gauche simple navigue dans l'application ; les autres (nouvel onglet, fenêtre…) restent au navigateur. */
export function isPlainLeftClick(event: ClickModifiers): boolean {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}
