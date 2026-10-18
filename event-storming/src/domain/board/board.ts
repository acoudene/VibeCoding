import type { BoardChange } from "./board-change";
import { DEFAULT_BOARD_NAME, boardName, type BoardName } from "./board-name";
import { EmptyBoardIdError, SelfLinkError, UnknownLinkError, UnknownStickyError } from "./errors";
import type { Frame } from "./frame";
import type { Position } from "./geometry";
import { classifyLink } from "./grammar";
import type { IdGenerator } from "./id-generator";
import type { Link } from "./link";
import { makeSticky, type Sticky, type StickyDraft, type StickyPatch } from "./sticky";

declare const boardIdBrand: unique symbol;
/** Identifiant de tableau (non vide ; le format est validé à la frontière de l'API). */
export type BoardId = string & { readonly [boardIdBrand]: true };

function isBoardId(raw: string): raw is BoardId {
  return raw !== "";
}

export function boardId(raw: string): BoardId {
  if (!isBoardId(raw)) throw new EmptyBoardIdError();
  return raw;
}

/** État complet d'un tableau, tel que reconstitué depuis un stockage. */
export interface BoardState {
  readonly id: BoardId;
  readonly name: BoardName;
  readonly stickies: readonly Sticky[];
  readonly links: readonly Link[];
  readonly frames: readonly Frame[];
}

/** Résultat d'une opération : le nouveau tableau et les modifications appliquées (vide si rien n'a changé). */
export interface BoardResult {
  readonly board: Board;
  readonly changes: BoardChange[];
}

/** Agrégat racine du contexte Board. Immuable : chaque opération renvoie un nouveau tableau. */
export class Board {
  private constructor(private readonly state: BoardState) {}

  static create(id: BoardId): Board {
    return new Board({ id, name: DEFAULT_BOARD_NAME, stickies: [], links: [], frames: [] });
  }

  /** Reconstitue un tableau depuis un état stocké (aucune modification émise). */
  static restore(state: BoardState): Board {
    return new Board(state);
  }

  get id(): BoardId {
    return this.state.id;
  }
  get name(): BoardName {
    return this.state.name;
  }
  get stickies(): readonly Sticky[] {
    return this.state.stickies;
  }
  get links(): readonly Link[] {
    return this.state.links;
  }
  get frames(): readonly Frame[] {
    return this.state.frames;
  }

  sticky(id: string): Sticky | undefined {
    return this.state.stickies.find((s) => s.id === id);
  }

  link(id: string): Link | undefined {
    return this.state.links.find((l) => l.id === id);
  }

  /** Dérivé des types des deux extrémités, jamais stocké : changer un type requalifie ses liens. */
  isOutOfGrammar(link: Link): boolean {
    return classifyLink(this.requireSticky(link.sourceId).kind, this.requireSticky(link.targetId).kind) === "outOfGrammar";
  }

  rename(raw: string): BoardResult {
    const name = boardName(raw);
    if (name === this.state.name) return this.unchanged();
    return this.with({ name }, [{ type: "BoardRenamed", name }]);
  }

  addSticky(draft: StickyDraft, idGenerator: IdGenerator): BoardResult {
    const sticky = makeSticky({
      id: idGenerator.next(),
      kind: draft.kind,
      label: draft.label ?? "",
      identifier: draft.identifier,
      position: draft.position,
      notes: draft.notes ?? "",
    });
    return this.with({ stickies: [...this.state.stickies, sticky] }, [{ type: "StickyAdded", sticky }]);
  }

  updateSticky(id: string, patch: StickyPatch): BoardResult {
    const current = this.requireSticky(id);
    return this.replaceSticky(
      current,
      makeSticky({
        id,
        kind: patch.kind ?? current.kind,
        label: patch.label ?? current.label,
        identifier: patch.identifier ?? current.identifier,
        position: current.position,
        notes: patch.notes ?? current.notes,
      }),
    );
  }

  moveSticky(id: string, to: Position): BoardResult {
    const current = this.requireSticky(id);
    return this.replaceSticky(current, { ...current, position: { x: to.x, y: to.y } });
  }

  /** Supprime les post-its et, en cascade, leurs liens (LinkRemoved émis avant StickyRemoved). */
  removeStickies(ids: readonly string[]): BoardResult {
    const removed = new Set(ids);
    for (const id of removed) this.requireSticky(id);
    if (removed.size === 0) return this.unchanged();
    const isCascaded = (l: Link) => removed.has(l.sourceId) || removed.has(l.targetId);
    const changes: BoardChange[] = [
      ...this.state.links.filter(isCascaded).map((l): BoardChange => ({ type: "LinkRemoved", linkId: l.id })),
      ...[...removed].map((stickyId): BoardChange => ({ type: "StickyRemoved", stickyId })),
    ];
    return this.with(
      {
        stickies: this.state.stickies.filter((s) => !removed.has(s.id)),
        links: this.state.links.filter((l) => !isCascaded(l)),
      },
      changes,
    );
  }

  /** Un lien hors grammaire est accepté (voir `isOutOfGrammar`) ; une boucle sur soi-même est refusée. */
  addLink(sourceId: string, targetId: string, idGenerator: IdGenerator): BoardResult {
    if (sourceId === targetId) throw new SelfLinkError();
    this.requireSticky(sourceId);
    this.requireSticky(targetId);
    const link: Link = { id: idGenerator.next(), sourceId, targetId };
    return this.with({ links: [...this.state.links, link] }, [{ type: "LinkAdded", link }]);
  }

  reverseLink(id: string): BoardResult {
    const current = this.requireLink(id);
    const link: Link = { id, sourceId: current.targetId, targetId: current.sourceId };
    return this.with({ links: this.state.links.map((l) => (l.id === id ? link : l)) }, [{ type: "LinkReversed", link }]);
  }

  removeLink(id: string): BoardResult {
    this.requireLink(id);
    return this.with({ links: this.state.links.filter((l) => l.id !== id) }, [{ type: "LinkRemoved", linkId: id }]);
  }

  private requireSticky(id: string): Sticky {
    const sticky = this.sticky(id);
    if (sticky === undefined) throw new UnknownStickyError(id);
    return sticky;
  }

  private requireLink(id: string): Link {
    const link = this.link(id);
    if (link === undefined) throw new UnknownLinkError(id);
    return link;
  }

  private replaceSticky(current: Sticky, next: Sticky): BoardResult {
    if (sameSticky(current, next)) return this.unchanged();
    return this.with(
      { stickies: this.state.stickies.map((s) => (s.id === next.id ? next : s)) },
      [{ type: "StickyUpdated", sticky: next }],
    );
  }

  private with(patch: Partial<BoardState>, changes: BoardChange[]): BoardResult {
    return { board: new Board({ ...this.state, ...patch }), changes };
  }

  private unchanged(): BoardResult {
    return { board: this, changes: [] };
  }
}

function sameSticky(a: Sticky, b: Sticky): boolean {
  return (
    a.kind === b.kind &&
    a.label === b.label &&
    a.identifier === b.identifier &&
    a.notes === b.notes &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y
  );
}
