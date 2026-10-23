import type { RenameBoardCommand } from "../../../application/board/rename-board";
import { EmptyBoardNameError } from "../../../domain/board/errors";

/** Renomme le tableau ; renvoie le message du domaine si le nom est refusé (vide), sinon `undefined`. */
export function commitBoardName(renameBoard: { execute(command: RenameBoardCommand): void }, name: string): string | undefined {
  try {
    renameBoard.execute({ name });
    return undefined;
  } catch (error) {
    if (error instanceof EmptyBoardNameError) return error.message;
    throw error;
  }
}
