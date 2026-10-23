import { EmptyBoardNameError } from "./errors";

export type BoardName = string;

export const DEFAULT_BOARD_NAME: BoardName = "Tableau sans titre";

/** Nom de tableau : texte non vide après suppression des espaces. */
export function boardName(raw: string): BoardName {
  const trimmed = raw.trim();
  if (trimmed === "") throw new EmptyBoardNameError();
  return trimmed;
}
