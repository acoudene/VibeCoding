import type { OnMoveEnd } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Viewport } from "../../../application/ports/viewport-store";
import type { BoardId } from "../../../domain/board/board";
import { openingView } from "../canvas/zoom";
import { useServices } from "../services";

/** Délai d'inactivité avant de mémoriser la vue : un zoom à la molette ne déclenche qu'une écriture. */
export const VIEWPORT_SAVE_DELAY_MS = 300;

/**
 * Vue mémorisée du tableau, pour ce navigateur (FR-052) : les propriétés xyflow de la vue d'ouverture
 * (`openingView`, calculée une fois) et le gestionnaire de fin de déplacement qui mémorise la vue, avec un délai.
 * Une vue en attente est enregistrée en quittant le tableau.
 */
export function useViewportMemory(
  boardId: BoardId,
  boardIsEmpty: boolean,
): { opening: ReturnType<typeof openingView>; onMoveEnd: OnMoveEnd } {
  const { viewports } = useServices();
  const [opening] = useState(() => openingView(viewports.load(boardId), boardIsEmpty));
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; viewport: Viewport } | undefined>(undefined);

  const flush = useCallback(() => {
    if (pending.current === undefined) return;
    clearTimeout(pending.current.timer);
    viewports.save(boardId, pending.current.viewport);
    pending.current = undefined;
  }, [boardId, viewports]);

  useEffect(() => flush, [flush]);

  const onMoveEnd = useCallback<OnMoveEnd>(
    (_event, viewport) => {
      if (pending.current !== undefined) clearTimeout(pending.current.timer);
      pending.current = { timer: setTimeout(flush, VIEWPORT_SAVE_DELAY_MS), viewport };
    },
    [flush],
  );

  return { opening, onMoveEnd };
}
