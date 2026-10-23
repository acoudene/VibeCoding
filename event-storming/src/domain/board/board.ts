import type { BoardChange } from "./board-change";
import { DEFAULT_BOARD_NAME, boardName, type BoardName } from "./board-name";
import {
  EmptyBoardIdError,
  EmptyFrameNameError,
  SelfLinkError,
  UnknownFrameError,
  UnknownLinkError,
  UnknownStickyError,
} from "./errors";
import { frameOf, nextFrameName, type Frame } from "./frame";
import { rect as makeRect, type Position, type Rect } from "./geometry";
import { classifyLink } from "./grammar";
import type { IdGenerator } from "./id-generator";
import type { Link } from "./link";
import { STICKY_SIZE, makeSticky, stickyCenter, type Sticky, type StickyDraft, type StickyPatch } from "./sticky";

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

/** Écart vertical entre un post-it et sa copie (en plus de la hauteur d'un post-it). */
export const DUPLICATE_GAP = 20;

/** Modification partielle d'un cadre. */
export interface FramePatch {
  readonly name?: string;
  readonly rect?: Rect;
}

/** Fragment copié : post-its (positions relatives au centre de la boîte englobante) et liens internes. */
export interface BoardFragment {
  readonly stickies: readonly {
    readonly kind: Sticky["kind"];
    readonly label: string;
    readonly identifier?: string;
    readonly notes: string;
    readonly offset: Position;
  }[];
  /** Liens dont les deux extrémités sont dans le fragment, par indice dans `stickies`. */
  readonly links: readonly { readonly sourceIndex: number; readonly targetIndex: number }[];
}

/** Résultat d'une création de post-its (dupliquer, coller). */
export interface BoardCreationResult extends BoardResult {
  readonly createdIds: readonly string[];
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
  readonly changes: readonly BoardChange[];
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

  addFrame(frameRect: Rect, idGenerator: IdGenerator): BoardResult {
    const rect = makeRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    const frame: Frame = { id: idGenerator.next(), name: nextFrameName(this.state.frames), rect };
    return this.with({ frames: [...this.state.frames, frame] }, [{ type: "FrameAdded", frame }]);
  }

  updateFrame(id: string, patch: FramePatch): BoardResult {
    const current = this.requireFrame(id);
    const name = patch.name === undefined ? current.name : patch.name.trim();
    if (name === "") throw new EmptyFrameNameError();
    const rect = patch.rect === undefined ? current.rect : makeRect(patch.rect.x, patch.rect.y, patch.rect.width, patch.rect.height);
    if (name === current.name && sameRect(rect, current.rect)) return this.unchanged();
    const frame: Frame = { id, name, rect };
    return this.with({ frames: this.state.frames.map((f) => (f.id === id ? frame : f)) }, [{ type: "FrameUpdated", frame }]);
  }

  /** Déplace le cadre et les post-its qui lui appartenaient avant le déplacement. */
  moveFrame(id: string, dx: number, dy: number): BoardResult {
    const current = this.requireFrame(id);
    if (dx === 0 && dy === 0) return this.unchanged();
    const frame: Frame = { ...current, rect: { ...current.rect, x: current.rect.x + dx, y: current.rect.y + dy } };
    const members = this.state.stickies.filter((s) => frameOf(stickyCenter(s), this.state.frames)?.id === id);
    const moved = members.map((s): Sticky => ({ ...s, position: { x: s.position.x + dx, y: s.position.y + dy } }));
    const movedById = new Map(moved.map((s) => [s.id, s]));
    return this.with(
      {
        frames: this.state.frames.map((f) => (f.id === id ? frame : f)),
        stickies: this.state.stickies.map((s) => movedById.get(s.id) ?? s),
      },
      [{ type: "FrameUpdated", frame }, ...moved.map((sticky): BoardChange => ({ type: "StickyUpdated", sticky }))],
    );
  }

  /** Supprime le cadre ; les post-its qu'il contenait restent sur le tableau. */
  removeFrame(id: string): BoardResult {
    this.requireFrame(id);
    return this.with({ frames: this.state.frames.filter((f) => f.id !== id) }, [{ type: "FrameRemoved", frameId: id }]);
  }

  /** Copie les post-its (et leurs liens internes) sous les originaux, décalés de STICKY_SIZE.height + DUPLICATE_GAP. */
  duplicate(stickyIds: readonly string[], idGenerator: IdGenerator): BoardCreationResult {
    const selected = this.requireStickies(stickyIds);
    if (selected.length === 0) return { board: this, changes: [], createdIds: [] };
    const center = boundingCenter(selected);
    return this.paste(this.copy(stickyIds), { x: center.x, y: center.y + STICKY_SIZE.height + DUPLICATE_GAP }, idGenerator);
  }

  /** Fragment des post-its sélectionnés ; indépendant du tableau (survit à la suppression des originaux). */
  copy(stickyIds: readonly string[]): BoardFragment {
    const selected = this.requireStickies(stickyIds);
    if (selected.length === 0) return { stickies: [], links: [] };
    const center = boundingCenter(selected);
    const indexOf = new Map(selected.map((s, i) => [s.id, i]));
    return {
      stickies: selected.map((s) => ({
        kind: s.kind,
        label: s.label,
        ...(s.identifier === undefined ? {} : { identifier: s.identifier }),
        notes: s.notes,
        offset: { x: s.position.x - center.x, y: s.position.y - center.y },
      })),
      links: this.state.links.flatMap((l) => {
        const sourceIndex = indexOf.get(l.sourceId);
        const targetIndex = indexOf.get(l.targetId);
        return sourceIndex === undefined || targetIndex === undefined ? [] : [{ sourceIndex, targetIndex }];
      }),
    };
  }

  /** Colle le fragment centré sur `at`, avec de nouveaux identifiants. */
  paste(fragment: BoardFragment, at: Position, idGenerator: IdGenerator): BoardCreationResult {
    const created = fragment.stickies.map((f) =>
      makeSticky({
        id: idGenerator.next(),
        kind: f.kind,
        label: f.label,
        identifier: f.identifier,
        notes: f.notes,
        position: { x: at.x + f.offset.x, y: at.y + f.offset.y },
      }),
    );
    const links = fragment.links.flatMap((l) => {
      const source = created[l.sourceIndex];
      const target = created[l.targetIndex];
      return source === undefined || target === undefined ? [] : [{ id: idGenerator.next(), sourceId: source.id, targetId: target.id }];
    });
    if (created.length === 0) return { board: this, changes: [], createdIds: [] };
    const changes: BoardChange[] = [
      ...created.map((sticky): BoardChange => ({ type: "StickyAdded", sticky })),
      ...links.map((link): BoardChange => ({ type: "LinkAdded", link })),
    ];
    const result = this.with({ stickies: [...this.state.stickies, ...created], links: [...this.state.links, ...links] }, changes);
    return { ...result, createdIds: created.map((s) => s.id) };
  }

  private requireStickies(ids: readonly string[]): Sticky[] {
    return [...new Set(ids)].map((id) => this.requireSticky(id));
  }

  private requireFrame(id: string): Frame {
    const frame = this.state.frames.find((f) => f.id === id);
    if (frame === undefined) throw new UnknownFrameError(id);
    return frame;
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

/** Centre de la boîte englobante des rectangles des post-its. */
function boundingCenter(stickies: readonly Sticky[]): Position {
  const xs = stickies.map((s) => s.position.x);
  const ys = stickies.map((s) => s.position.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs) + STICKY_SIZE.width) / 2,
    y: (Math.min(...ys) + Math.max(...ys) + STICKY_SIZE.height) / 2,
  };
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
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
