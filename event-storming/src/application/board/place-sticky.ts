import type { Position } from "../../domain/board/geometry";
import type { IdGenerator } from "../../domain/board/id-generator";
import type { StickyKind } from "../../domain/board/sticky-kind";
import type { BoardStore } from "../ports/board-store";

export interface PlaceStickyCommand {
  readonly kind: StickyKind;
  /** Coin haut-gauche du post-it. */
  readonly position: Position;
  readonly label?: string;
}

export interface PlaceStickyResult {
  readonly id: string;
}

/** Pose un post-it du type choisi (FR-010) ; la couleur découle du type. */
export class PlaceSticky {
  constructor(
    private readonly store: BoardStore,
    private readonly ids: IdGenerator,
  ) {}

  execute(command: PlaceStickyCommand): PlaceStickyResult {
    const { kind, position, label } = command;
    const draft = label === undefined ? { kind, position } : { kind, position, label };
    const { changes } = this.store.current().addSticky(draft, this.ids);
    this.store.apply(changes);
    const added = changes[0];
    if (added?.type !== "StickyAdded") throw new Error("Le tableau n'a pas émis StickyAdded");
    return { id: added.sticky.id };
  }
}
