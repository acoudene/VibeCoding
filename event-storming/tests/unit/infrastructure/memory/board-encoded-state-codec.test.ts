import { describe, expect, it } from "vitest";
import { Board, boardId } from "../../../../src/domain/board/board";
import { decodeBoard, encodeBoard } from "../../../../src/infrastructure/memory/board-encoded-state-codec";
import { sequentialIds } from "../../domain/board/sequential-ids";

const id = boardId("b-1");
const bytes = (text: string) => new TextEncoder().encode(text);

describe("board-encoded-state-codec", () => {
  it("relit ce qu'il a encodé", () => {
    const board = Board.create(id).addSticky({ kind: "Actor", position: { x: 1, y: 2 } }, sequentialIds()).board;
    expect(decodeBoard(id, encodeBoard(board)).stickies).toEqual(board.stickies);
  });

  it("refuse un état encodé qui n'est pas un état de tableau", () => {
    expect(() => decodeBoard(id, bytes("42"))).toThrow(/état encodé/i);
    expect(() => decodeBoard(id, bytes('{"name":"x","stickies":{}}'))).toThrow(/état encodé/i);
    expect(() => decodeBoard(id, bytes('{"name":1,"stickies":[],"links":[],"frames":[]}'))).toThrow(/état encodé/i);
  });
});
