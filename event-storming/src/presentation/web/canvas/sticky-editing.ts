import { createContext, useContext } from "react";

export interface StickyEditing {
  /** Termine l'édition du texte du post-it `id` en enregistrant `label`. */
  finishEditing(id: string, label: string): void;
}

/** Fourni par le canevas aux nœuds post-its, que xyflow rend sans accès direct à son état. */
export const StickyEditingContext = createContext<StickyEditing | undefined>(undefined);

export function useStickyEditing(): StickyEditing {
  const editing = useContext(StickyEditingContext);
  if (editing === undefined) throw new Error("StickyEditingContext manquant");
  return editing;
}
