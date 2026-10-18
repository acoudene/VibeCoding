import * as Y from "yjs";
import { Board, type BoardId } from "../../domain/board/board";
import { DEFAULT_BOARD_NAME, type BoardName } from "../../domain/board/board-name";
import type { BoardChange } from "../../domain/board/board-change";
import type { Frame } from "../../domain/board/frame";
import type { Link } from "../../domain/board/link";
import { makeSticky, type Sticky } from "../../domain/board/sticky";
import { STICKY_KINDS, type StickyKind } from "../../domain/board/sticky-kind";

/**
 * Schéma du `Y.Doc` d'un tableau (plan 002, « Contrats externes ») :
 * `meta { name }`, `stickies: id → { kind, label, identifier?, notes, x, y }`,
 * `links: id → { sourceId, targetId }`, `frames: id → { name, x, y, width, height }`.
 * `outOfGrammar` est dérivé par le domaine, jamais stocké.
 */

/** Origine des transactions des actions locales : seule origine suivie par l'historique. */
export const LOCAL_ORIGIN = Symbol("event-storming/local");

type Fields = Y.Map<unknown>;

interface BoardDocTypes {
  readonly meta: Fields;
  readonly stickies: Y.Map<unknown>;
  readonly links: Y.Map<unknown>;
  readonly frames: Y.Map<unknown>;
}

/** Types partagés de premier niveau du document (portée de l'historique). */
export function boardDocTypes(doc: Y.Doc): BoardDocTypes {
  return {
    meta: doc.getMap<unknown>("meta"),
    stickies: doc.getMap<unknown>("stickies"),
    links: doc.getMap<unknown>("links"),
    frames: doc.getMap<unknown>("frames"),
  };
}

/** Applique les modifications d'une action dans une seule transaction d'origine locale. */
export function applyChanges(doc: Y.Doc, changes: readonly BoardChange[]): void {
  const types = boardDocTypes(doc);
  doc.transact(() => {
    for (const change of changes) applyChange(types, change);
  }, LOCAL_ORIGIN);
}

function applyChange(types: BoardDocTypes, change: BoardChange): void {
  switch (change.type) {
    case "BoardRenamed":
      types.meta.set("name", change.name);
      return;
    case "StickyAdded":
    case "StickyUpdated":
      writeEntry(types.stickies, change.sticky.id, stickyFields(change.sticky));
      return;
    case "StickyRemoved":
      types.stickies.delete(change.stickyId);
      return;
    case "LinkAdded":
    case "LinkReversed":
      writeEntry(types.links, change.link.id, { sourceId: change.link.sourceId, targetId: change.link.targetId });
      return;
    case "LinkRemoved":
      types.links.delete(change.linkId);
      return;
    case "FrameAdded":
    case "FrameUpdated":
      writeEntry(types.frames, change.frame.id, { name: change.frame.name, ...change.frame.rect });
      return;
    case "FrameRemoved":
      types.frames.delete(change.frameId);
      return;
  }
}

function stickyFields(sticky: Sticky): Record<string, string | number | undefined> {
  return {
    kind: sticky.kind,
    label: sticky.label,
    identifier: sticky.identifier,
    notes: sticky.notes,
    x: sticky.position.x,
    y: sticky.position.y,
  };
}

/**
 * Écrit un élément : crée sa carte, ou ne modifie que les champs qui changent (mises à jour
 * minimales, annulation champ par champ). Un champ `undefined` est retiré.
 */
function writeEntry(collection: Y.Map<unknown>, id: string, fields: Record<string, string | number | undefined>): void {
  const existing = collection.get(id);
  if (!(existing instanceof Y.Map)) {
    const entries = Object.entries(fields).filter((entry): entry is [string, string | number] => entry[1] !== undefined);
    collection.set(id, new Y.Map<unknown>(entries));
    return;
  }
  const entry: Fields = existing;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      if (entry.has(key)) entry.delete(key);
    } else if (entry.get(key) !== value) {
      entry.set(key, value);
    }
  }
}

/**
 * Lit le tableau depuis le document. Le contenu vient du serveur : il est lu défensivement,
 * chaque entrée mal formée est ignorée (et un lien vers un post-it absent, ou vers lui-même).
 */
export function readBoard(id: BoardId, doc: Y.Doc): Board {
  const types = boardDocTypes(doc);
  const stickies = readEntries(types.stickies, readSticky);
  const stickyIds = new Set(stickies.map((s) => s.id));
  const links = readEntries(types.links, readLink).filter(
    (l) => l.sourceId !== l.targetId && stickyIds.has(l.sourceId) && stickyIds.has(l.targetId),
  );
  const frames = readEntries(types.frames, readFrame);
  return Board.restore({ id, name: readName(types.meta), stickies, links, frames });
}

function readName(meta: Fields): BoardName {
  const name = meta.get("name");
  return typeof name === "string" && name.trim() !== "" ? name : DEFAULT_BOARD_NAME;
}

function readEntries<T>(collection: Y.Map<unknown>, read: (id: string, fields: Fields) => T | undefined): T[] {
  const result: T[] = [];
  for (const [id, value] of collection.entries()) {
    if (!(value instanceof Y.Map)) continue;
    const element = read(id, value);
    if (element !== undefined) result.push(element);
  }
  return result;
}

function readSticky(id: string, fields: Fields): Sticky | undefined {
  const kind = fields.get("kind");
  const label = fields.get("label");
  const identifier = fields.get("identifier");
  const notes = fields.get("notes");
  const x = fields.get("x");
  const y = fields.get("y");
  if (!isStickyKind(kind) || typeof label !== "string" || typeof notes !== "string") return undefined;
  if (identifier !== undefined && typeof identifier !== "string") return undefined;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return undefined;
  return makeSticky({ id, kind, label, identifier, notes, position: { x, y } });
}

function readLink(id: string, fields: Fields): Link | undefined {
  const sourceId = fields.get("sourceId");
  const targetId = fields.get("targetId");
  if (typeof sourceId !== "string" || typeof targetId !== "string") return undefined;
  return { id, sourceId, targetId };
}

function readFrame(id: string, fields: Fields): Frame | undefined {
  const name = fields.get("name");
  const x = fields.get("x");
  const y = fields.get("y");
  const width = fields.get("width");
  const height = fields.get("height");
  if (typeof name !== "string" || !isFiniteNumber(x) || !isFiniteNumber(y)) return undefined;
  if (!isFiniteNumber(width) || !isFiniteNumber(height) || width <= 0 || height <= 0) return undefined;
  return { id, name, rect: { x, y, width, height } };
}

function isStickyKind(value: unknown): value is StickyKind {
  return STICKY_KINDS.some((kind) => kind === value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
