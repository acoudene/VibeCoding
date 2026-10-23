import { createContext, useContext } from "react";
import type { Rect } from "../../../domain/board/geometry";

export interface FrameEditing {
  /** Termine l'édition du nom du cadre `id` ; `undefined` : édition annulée (Échap), le nom est inchangé. */
  finishRenaming(id: string, name: string | undefined): void;
  /** Fin d'un redimensionnement : enregistre le nouveau rectangle du cadre. */
  resize(id: string, rect: Rect): void;
}

/** Fourni par le canevas aux nœuds cadres, que xyflow rend sans accès direct à son état. */
export const FrameEditingContext = createContext<FrameEditing | undefined>(undefined);

export function useFrameEditing(): FrameEditing {
  const editing = useContext(FrameEditingContext);
  if (editing === undefined) throw new Error("FrameEditingContext manquant");
  return editing;
}
