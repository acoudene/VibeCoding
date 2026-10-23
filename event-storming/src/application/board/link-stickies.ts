import type { IdGenerator } from "../../domain/board/id-generator";
import type { BoardStore } from "../ports/board-store";

export interface LinkStickiesCommand {
  readonly sourceId: string;
  readonly targetId: string;
}

export interface LinkStickiesResult {
  readonly id: string;
  /** Lien accepté mais à signaler (FR-022) : on ne bloque jamais l'atelier. */
  readonly outOfGrammar: boolean;
}

/** Relie deux post-its (FR-020) ; un lien hors grammaire est créé et signalé. */
export class LinkStickies {
  constructor(
    private readonly store: BoardStore,
    private readonly ids: IdGenerator,
  ) {}

  execute(command: LinkStickiesCommand): LinkStickiesResult {
    const { board, changes } = this.store.current().addLink(command.sourceId, command.targetId, this.ids);
    this.store.apply(changes);
    const added = changes[0];
    if (added?.type !== "LinkAdded") throw new Error("Le tableau n'a pas émis LinkAdded");
    return { id: added.link.id, outOfGrammar: board.isOutOfGrammar(added.link) };
  }
}
