import { describe, expect, it } from "vitest";
import { Board, boardId } from "../../../../src/domain/board/board";
import { DEFAULT_BOARD_NAME } from "../../../../src/domain/board/board-name";
import { EmptyBoardIdError, EmptyBoardNameError, UnknownStickyError } from "../../../../src/domain/board/errors";
import { position } from "../../../../src/domain/board/geometry";
import { sequentialIds } from "./sequential-ids";

const empty = () => Board.create(boardId("b1"));

describe("boardId", () => {
  it("conserve un identifiant non vide", () => expect(boardId("abc")).toBe("abc"));
  it("refuse l'identifiant vide", () => {
    expect(() => boardId("")).toThrow(EmptyBoardIdError);
    expect(() => boardId("")).toThrow("L'identifiant du tableau est obligatoire");
  });
});

describe("Board.create", () => {
  it("crée un tableau vide nommé « Tableau sans titre »", () => {
    const board = empty();
    expect(board.id).toBe("b1");
    expect(board.name).toBe(DEFAULT_BOARD_NAME);
    expect(board.stickies).toEqual([]);
    expect(board.links).toEqual([]);
    expect(board.frames).toEqual([]);
  });
});

describe("Board.restore", () => {
  it("reconstitue un tableau à partir de son état", () => {
    const sticky = { id: "s1", kind: "Command" as const, label: "Passer commande", position: position(0, 0), notes: "" };
    const board = Board.restore({ id: boardId("b1"), name: "Atelier", stickies: [sticky], links: [], frames: [] });
    expect(board.name).toBe("Atelier");
    expect(board.sticky("s1")).toEqual(sticky);
  });
});

describe("Board.rename", () => {
  it("renomme en retirant les espaces et émet BoardRenamed", () => {
    const { board, changes } = empty().rename("  Atelier commandes ");
    expect(board.name).toBe("Atelier commandes");
    expect(changes).toEqual([{ type: "BoardRenamed", name: "Atelier commandes" }]);
  });
  it("refuse un nom vide", () => expect(() => empty().rename("  ")).toThrow(EmptyBoardNameError));
  it("n'émet rien si le nom est inchangé", () => {
    const { board, changes } = empty().rename(DEFAULT_BOARD_NAME);
    expect(changes).toEqual([]);
    expect(board.name).toBe(DEFAULT_BOARD_NAME);
  });
  it("ne modifie pas le tableau d'origine (immuable)", () => {
    const original = empty();
    original.rename("Autre");
    expect(original.name).toBe(DEFAULT_BOARD_NAME);
  });
});

describe("Board.addSticky", () => {
  it("pose un post-it du type demandé, texte et notes vides, sans identifiant, et émet StickyAdded", () => {
    const { board, changes } = empty().addSticky({ kind: "Command", position: position(400, 300) }, sequentialIds("s"));
    const expected = { id: "s-1", kind: "Command", label: "", position: { x: 400, y: 300 }, notes: "" };
    expect(board.stickies).toEqual([expected]);
    expect(board.sticky("s-1")).not.toHaveProperty("identifier");
    expect(changes).toEqual([{ type: "StickyAdded", sticky: expected }]);
  });
  it("accepte un texte, un identifiant et des notes initiaux", () => {
    const { board } = empty().addSticky(
      { kind: "DomainEvent", position: position(0, 0), label: "Commande passée", identifier: "OrderPlaced", notes: "n" },
      sequentialIds("s"),
    );
    expect(board.sticky("s-1")).toMatchObject({ label: "Commande passée", identifier: "OrderPlaced", notes: "n" });
  });
  it("un identifiant initial vide signifie « sans identifiant »", () => {
    const { board } = empty().addSticky({ kind: "Command", position: position(0, 0), identifier: "" }, sequentialIds("s"));
    expect(board.sticky("s-1")).not.toHaveProperty("identifier");
  });
  it("ne modifie pas le tableau d'origine (immuable)", () => {
    const original = empty();
    original.addSticky({ kind: "Command", position: position(0, 0) }, sequentialIds("s"));
    expect(original.stickies).toEqual([]);
  });
});

describe("Board.updateSticky", () => {
  const withSticky = () =>
    empty().addSticky({ kind: "DomainEvent", position: position(0, 0), label: "Commande" }, sequentialIds("s")).board;

  it("modifie le texte, l'identifiant et les notes et émet StickyUpdated avec le post-it complet", () => {
    const { board, changes } = withSticky().updateSticky("s-1", {
      label: "Commande passée",
      identifier: "OrderPlaced",
      notes: "Montant > 0",
    });
    const expected = {
      id: "s-1",
      kind: "DomainEvent",
      label: "Commande passée",
      identifier: "OrderPlaced",
      position: { x: 0, y: 0 },
      notes: "Montant > 0",
    };
    expect(board.sticky("s-1")).toEqual(expected);
    expect(changes).toEqual([{ type: "StickyUpdated", sticky: expected }]);
  });
  it("ne touche qu'aux champs fournis", () => {
    const { board } = withSticky().updateSticky("s-1", { notes: "x" });
    expect(board.sticky("s-1")).toMatchObject({ label: "Commande", notes: "x", kind: "DomainEvent" });
  });
  it("change le type", () =>
    expect(withSticky().updateSticky("s-1", { kind: "Hotspot" }).board.sticky("s-1")?.kind).toBe("Hotspot"));
  it("un identifiant vide retire l'identifiant", () => {
    const named = withSticky().updateSticky("s-1", { identifier: "OrderPlaced" }).board;
    const { board, changes } = named.updateSticky("s-1", { identifier: "" });
    expect(board.sticky("s-1")).not.toHaveProperty("identifier");
    expect(changes).toHaveLength(1);
  });
  it("n'émet rien si rien ne change", () => {
    expect(withSticky().updateSticky("s-1", { label: "Commande", identifier: "" }).changes).toEqual([]);
    expect(withSticky().updateSticky("s-1", {}).changes).toEqual([]);
  });
  it("refuse un post-it inconnu", () => {
    expect(() => withSticky().updateSticky("nope", { label: "x" })).toThrow(UnknownStickyError);
    expect(() => withSticky().updateSticky("nope", { label: "x" })).toThrow("Post-it inconnu : nope");
  });
});

describe("Board.moveSticky", () => {
  const withSticky = () =>
    empty().addSticky({ kind: "DomainEvent", position: position(100, 100) }, sequentialIds("s")).board;

  it("déplace le post-it et émet StickyUpdated", () => {
    const { board, changes } = withSticky().moveSticky("s-1", position(250, 180));
    expect(board.sticky("s-1")?.position).toEqual({ x: 250, y: 180 });
    expect(changes).toEqual([{ type: "StickyUpdated", sticky: board.sticky("s-1") }]);
  });
  it("n'émet rien si la position est inchangée", () =>
    expect(withSticky().moveSticky("s-1", position(100, 100)).changes).toEqual([]));
  it("refuse un post-it inconnu", () =>
    expect(() => withSticky().moveSticky("nope", position(0, 0))).toThrow(UnknownStickyError));
});

describe("Board.removeStickies", () => {
  /** s-1 (Command) → s-2 (Aggregate) → s-3 (DomainEvent), liens l-1 et l-2. */
  function chain(): Board {
    const ids = sequentialIds("s");
    const linkIds = sequentialIds("l");
    let board = empty();
    for (const kind of ["Command", "Aggregate", "DomainEvent"] as const)
      board = board.addSticky({ kind, position: position(0, 0) }, ids).board;
    board = board.addLink("s-1", "s-2", linkIds).board;
    return board.addLink("s-2", "s-3", linkIds).board;
  }

  it("supprime le post-it et ses liens (cascade), liens d'abord puis post-its", () => {
    const { board, changes } = chain().removeStickies(["s-2"]);
    expect(board.stickies.map((s) => s.id)).toEqual(["s-1", "s-3"]);
    expect(board.links).toEqual([]);
    expect(changes).toEqual([
      { type: "LinkRemoved", linkId: "l-1" },
      { type: "LinkRemoved", linkId: "l-2" },
      { type: "StickyRemoved", stickyId: "s-2" },
    ]);
  });
  it("supprime plusieurs post-its ; un lien entre eux et un identifiant répété ne comptent qu'une fois", () => {
    const { board, changes } = chain().removeStickies(["s-1", "s-2", "s-1"]);
    expect(board.stickies.map((s) => s.id)).toEqual(["s-3"]);
    expect(changes).toEqual([
      { type: "LinkRemoved", linkId: "l-1" },
      { type: "LinkRemoved", linkId: "l-2" },
      { type: "StickyRemoved", stickyId: "s-1" },
      { type: "StickyRemoved", stickyId: "s-2" },
    ]);
  });
  it("conserve les liens qui ne touchent pas les post-its supprimés", () =>
    expect(chain().removeStickies(["s-1"]).board.links.map((l) => l.id)).toEqual(["l-2"]));
  it("refuse un post-it inconnu sans rien supprimer", () => {
    const board = chain();
    expect(() => board.removeStickies(["s-1", "nope"])).toThrow(UnknownStickyError);
    expect(board.stickies).toHaveLength(3);
  });
  it("n'émet rien pour une liste vide", () => expect(chain().removeStickies([]).changes).toEqual([]));
});
