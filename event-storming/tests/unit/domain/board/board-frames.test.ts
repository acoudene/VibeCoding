import { describe, expect, it } from "vitest";
import { Board, boardId } from "../../../../src/domain/board/board";
import { EmptyFrameNameError, InvalidRectError, UnknownFrameError } from "../../../../src/domain/board/errors";
import { position, rect } from "../../../../src/domain/board/geometry";
import { sequentialIds } from "./sequential-ids";

const empty = () => Board.create(boardId("b1"));

/** Cadre f-1 (0,0,400,400) ; s-1 dedans (centre 100,100) ; s-2 dehors (centre 900,900). */
function scene(): Board {
  const sids = sequentialIds("s");
  let board = empty().addFrame(rect(0, 0, 400, 400), sequentialIds("f")).board;
  board = board.addSticky({ kind: "Command", position: position(20, 20) }, sids).board;
  board = board.addSticky({ kind: "Command", position: position(820, 820) }, sids).board;
  return board;
}

describe("Board.addFrame", () => {
  it("ajoute un cadre nommé « Contexte N » et émet FrameAdded", () => {
    const first = empty().addFrame(rect(0, 0, 100, 100), sequentialIds("f"));
    const frame = { id: "f-1", name: "Contexte 1", rect: rect(0, 0, 100, 100) };
    expect(first.board.frames).toEqual([frame]);
    expect(first.changes).toEqual([{ type: "FrameAdded", frame }]);
    const second = first.board.addFrame(rect(0, 0, 50, 50), sequentialIds("g"));
    expect(second.board.frames[1]?.name).toBe("Contexte 2");
  });
});

describe("Board.updateFrame", () => {
  it("renomme (nom nettoyé) et émet FrameUpdated", () => {
    const { board, changes } = scene().updateFrame("f-1", { name: "  Commandes " });
    expect(board.frames[0]?.name).toBe("Commandes");
    expect(changes).toEqual([{ type: "FrameUpdated", frame: board.frames[0] }]);
  });
  it("redimensionne", () => {
    const { board } = scene().updateFrame("f-1", { rect: rect(0, 0, 10, 10) });
    expect(board.frames[0]?.rect).toEqual(rect(0, 0, 10, 10));
  });
  it("refuse un nom vide", () => {
    expect(() => scene().updateFrame("f-1", { name: "  " })).toThrow(EmptyFrameNameError);
    expect(() => scene().updateFrame("f-1", { name: "" })).toThrow("Le nom du cadre est obligatoire");
  });
  it("refuse un rectangle invalide", () => {
    expect(() => scene().updateFrame("f-1", { rect: { x: 0, y: 0, width: 0, height: 5 } })).toThrow(InvalidRectError);
  });
  it("ne change rien si le patch est sans effet", () => {
    const board = scene();
    const result = board.updateFrame("f-1", { name: "Contexte 1" });
    expect(result.board).toBe(board);
    expect(result.changes).toEqual([]);
  });
  it("refuse un cadre inconnu", () => {
    expect(() => scene().updateFrame("nope", { name: "x" })).toThrow(UnknownFrameError);
    expect(() => scene().updateFrame("nope", { name: "x" })).toThrow("Cadre inconnu : nope");
  });
});

describe("Board.moveFrame", () => {
  it("déplace le cadre et ses membres, un changement chacun", () => {
    const { board, changes } = scene().moveFrame("f-1", 50, -10);
    expect(board.frames[0]?.rect).toEqual(rect(50, -10, 400, 400));
    expect(board.sticky("s-1")?.position).toEqual(position(70, 10));
    expect(board.sticky("s-2")?.position).toEqual(position(820, 820));
    expect(changes.map((c) => c.type)).toEqual(["FrameUpdated", "StickyUpdated"]);
  });
  it("calcule les membres avant le déplacement", () => {
    // s-2 serait dans le cadre après déplacement : il ne suit pas
    const { board } = scene().moveFrame("f-1", 800, 800);
    expect(board.sticky("s-2")?.position).toEqual(position(820, 820));
  });
  it("ne change rien pour un déplacement nul", () => {
    const board = scene();
    const result = board.moveFrame("f-1", 0, 0);
    expect(result.board).toBe(board);
    expect(result.changes).toEqual([]);
  });
  it("refuse un cadre inconnu", () => {
    expect(() => scene().moveFrame("nope", 1, 1)).toThrow(UnknownFrameError);
  });
});

describe("Board.removeFrame", () => {
  it("supprime le cadre sans toucher aux post-its et émet FrameRemoved", () => {
    const { board, changes } = scene().removeFrame("f-1");
    expect(board.frames).toEqual([]);
    expect(board.stickies).toHaveLength(2);
    expect(changes).toEqual([{ type: "FrameRemoved", frameId: "f-1" }]);
  });
  it("refuse un cadre inconnu", () => {
    expect(() => scene().removeFrame("nope")).toThrow(UnknownFrameError);
  });
});
