import { useSyncExternalStore } from "react";
import type { Board } from "../../../domain/board/board";
import { useServices } from "../services";

/** Tableau ouvert, rafraîchi à chaque modification. À n'utiliser qu'une fois la session ouverte (`phase: "open"`). */
export function useBoard(): Board {
  const { currentBoard, onBoardChange } = useServices();
  return useSyncExternalStore(onBoardChange, currentBoard);
}
