import type { Viewport } from "../../../application/ports/viewport-store";

/** Zoom affiché à côté des boutons + / − (FR-051), ex. « 120 % ». */
export function zoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)} %`;
}

/** « Ajuster à l'écran » montre tout le tableau sans agrandir au-delà de 100 % (un seul post-it ne remplit pas l'écran). */
export const FIT_VIEW_OPTIONS = { maxZoom: 1, padding: 0.1 } as const;

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

/**
 * Vue à l'ouverture du tableau (FR-052) : la vue mémorisée, sinon le tableau ajusté à l'écran. Un tableau vide
 * s'ouvre à 100 % : xyflow ajusterait sinon la vue sur le premier post-it posé.
 */
export function openingView(
  saved: Viewport | undefined,
  boardIsEmpty: boolean,
): { readonly defaultViewport: Viewport } | { readonly fitView: true; readonly fitViewOptions: typeof FIT_VIEW_OPTIONS } {
  if (saved !== undefined) return { defaultViewport: saved };
  return boardIsEmpty ? { defaultViewport: DEFAULT_VIEWPORT } : { fitView: true, fitViewOptions: FIT_VIEW_OPTIONS };
}
