import type { OnMoveEnd } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Viewport } from "../../../application/ports/viewport-store";
import type { BoardId } from "../../../domain/board/board";
import { openingView } from "../canvas/zoom";
import { useServices } from "../services";
import { DebouncedSave } from "./debounced-save";
import { browserPageExit } from "./page-exit";

/** Délai d'inactivité avant de mémoriser la vue : un zoom à la molette ne déclenche qu'une écriture. */
export const VIEWPORT_SAVE_DELAY_MS = 300;

/**
 * Vue mémorisée du tableau, pour ce navigateur (FR-052) : les propriétés xyflow de la vue d'ouverture
 * (`openingView`, calculée une fois) et le gestionnaire de fin de déplacement qui mémorise la vue, avec un délai.
 * Une vue en attente est enregistrée en quittant le tableau, ou quand la page est masquée ou fermée.
 */
export function useViewportMemory(
  boardId: BoardId,
  boardIsEmpty: boolean,
): { opening: ReturnType<typeof openingView>; onMoveEnd: OnMoveEnd } {
  const { viewports } = useServices();
  const [opening] = useState(() => openingView(viewports.load(boardId), boardIsEmpty));
  const saver = useMemo(
    () => new DebouncedSave<Viewport>(VIEWPORT_SAVE_DELAY_MS, (viewport) => viewports.save(boardId, viewport)),
    [boardId, viewports],
  );

  useEffect(() => {
    const stopListening = browserPageExit.onHidden(() => saver.flush());
    return () => {
      stopListening();
      saver.flush();
    };
  }, [saver]);

  const onMoveEnd = useCallback<OnMoveEnd>((_event, viewport) => saver.schedule(viewport), [saver]);

  return { opening, onMoveEnd };
}
