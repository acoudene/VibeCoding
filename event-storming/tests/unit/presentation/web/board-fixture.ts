import { Board, boardId } from "../../../../src/domain/board/board";
import { boardName } from "../../../../src/domain/board/board-name";
import type { Frame } from "../../../../src/domain/board/frame";
import type { Link } from "../../../../src/domain/board/link";
import type { Sticky } from "../../../../src/domain/board/sticky";

export function sticky(id: string, overrides: Partial<Sticky> = {}): Sticky {
  return { id, kind: "DomainEvent", label: "", position: { x: 0, y: 0 }, notes: "", ...overrides };
}

export function frame(id: string, overrides: Partial<Frame> = {}): Frame {
  return { id, name: "Contexte 1", rect: { x: 0, y: 0, width: 400, height: 300 }, ...overrides };
}

export function link(id: string, sourceId: string, targetId: string): Link {
  return { id, sourceId, targetId };
}

export function makeBoard(content: { stickies?: Sticky[]; links?: Link[]; frames?: Frame[] } = {}): Board {
  return Board.restore({
    id: boardId("b"),
    name: boardName("Tableau"),
    stickies: content.stickies ?? [],
    links: content.links ?? [],
    frames: content.frames ?? [],
  });
}
