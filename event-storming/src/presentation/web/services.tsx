import { createContext, useContext, type ReactNode } from "react";
import type { CopySelection } from "../../application/board/copy-selection";
import type { CreateBoard } from "../../application/board/create-board";
import type { DeleteSelection } from "../../application/board/delete-selection";
import type { DrawFrame } from "../../application/board/draw-frame";
import type { DuplicateSelection } from "../../application/board/duplicate-selection";
import type { EditFrame } from "../../application/board/edit-frame";
import type { EditLink } from "../../application/board/edit-link";
import type { EditSticky } from "../../application/board/edit-sticky";
import type { LinkStickies } from "../../application/board/link-stickies";
import type { MoveElements } from "../../application/board/move-elements";
import type { OpenBoard } from "../../application/board/open-board";
import type { PasteFragment } from "../../application/board/paste-fragment";
import type { PlaceSticky } from "../../application/board/place-sticky";
import type { Redo } from "../../application/board/redo";
import type { RenameBoard } from "../../application/board/rename-board";
import type { Undo } from "../../application/board/undo";
import type { Unsubscribe } from "../../application/ports/board-store";
import type { BoardSync } from "../../application/ports/board-sync";
import type { ViewportStore } from "../../application/ports/viewport-store";
import type { ForgetRecentBoard } from "../../application/recent-boards/forget";
import type { ListRecentBoards } from "../../application/recent-boards/list";
import type { Board, BoardId } from "../../domain/board/board";

/**
 * Services applicatifs fournis à React par la racine de composition (`main.web.tsx`) via `ServicesProvider`.
 * La présentation ne voit que des cas d'usage et des ports : jamais de classe d'infrastructure.
 */
export interface Services {
  readonly createBoard: CreateBoard;
  readonly openBoard: OpenBoard;
  readonly renameBoard: RenameBoard;
  readonly listRecentBoards: ListRecentBoards;
  readonly forgetRecentBoard: ForgetRecentBoard;
  /** Démarre la synchronisation du tableau ouvert ; l'appelant doit appeler `stop()` en quittant le tableau. */
  readonly startSync: (id: BoardId) => BoardSync;
  readonly placeSticky: PlaceSticky;
  readonly editSticky: EditSticky;
  /** Fin d'un glissement de post-its et de cadres : une seule étape d'annulation. */
  readonly moveElements: MoveElements;
  readonly deleteSelection: DeleteSelection;
  readonly linkStickies: LinkStickies;
  readonly editLink: EditLink;
  readonly drawFrame: DrawFrame;
  readonly editFrame: EditFrame;
  readonly duplicateSelection: DuplicateSelection;
  readonly copySelection: CopySelection;
  readonly pasteFragment: PasteFragment;
  readonly undo: Undo;
  readonly redo: Redo;
  /** État de l'historique du tableau ouvert, relu après chaque modification (boutons Annuler / Rétablir). */
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  /** Vue mémorisée de chaque tableau, pour ce navigateur (FR-052). */
  readonly viewports: ViewportStore;
  /** Tableau ouvert (même objet tant qu'il n'a pas changé) ; lève une erreur avant la fin de `openBoard`. */
  readonly currentBoard: () => Board;
  /** Notifié après chaque modification du tableau ouvert (cas d'usage, annuler, rétablir), jamais à l'ouverture. */
  readonly onBoardChange: (listener: () => void) => Unsubscribe;
}

const ServicesContext = createContext<Services | undefined>(undefined);

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (services === undefined) throw new Error("ServicesProvider manquant");
  return services;
}
