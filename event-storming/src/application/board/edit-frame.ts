import type { Rect } from "../../domain/board/geometry";
import type { BoardResult } from "../../domain/board/board";
import type { BoardStore } from "../ports/board-store";

export type EditFrameCommand = { readonly frameId: string } & (
  | { readonly action: "rename"; readonly name: string }
  | { readonly action: "resize"; readonly rect: Rect }
  | { readonly action: "move"; readonly dx: number; readonly dy: number }
  | { readonly action: "remove" }
);

/** Renomme, redimensionne, déplace (avec ses post-its) ou supprime un cadre (FR-031, FR-032). */
export class EditFrame {
  constructor(private readonly store: BoardStore) {}

  execute(command: EditFrameCommand): void {
    this.store.apply(this.change(command).changes);
  }

  private change(command: EditFrameCommand): BoardResult {
    const board = this.store.current();
    switch (command.action) {
      case "rename":
        return board.updateFrame(command.frameId, { name: command.name });
      case "resize":
        return board.updateFrame(command.frameId, { rect: command.rect });
      case "move":
        return board.moveFrame(command.frameId, command.dx, command.dy);
      case "remove":
        return board.removeFrame(command.frameId);
    }
  }
}
