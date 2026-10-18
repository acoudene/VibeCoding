import type { IdGenerator } from "../../domain/board/id-generator";
import type { Rect } from "../../domain/board/geometry";
import type { BoardStore } from "../ports/board-store";

export interface DrawFrameCommand {
  readonly rect: Rect;
}

export interface DrawFrameResult {
  readonly id: string;
}

/** Dessine un cadre de contexte borné, nommé « Contexte N » (FR-030). */
export class DrawFrame {
  constructor(
    private readonly store: BoardStore,
    private readonly ids: IdGenerator,
  ) {}

  execute(command: DrawFrameCommand): DrawFrameResult {
    const { changes } = this.store.current().addFrame(command.rect, this.ids);
    this.store.apply(changes);
    const added = changes[0];
    if (added?.type !== "FrameAdded") throw new Error("Le tableau n'a pas émis FrameAdded");
    return { id: added.frame.id };
  }
}
