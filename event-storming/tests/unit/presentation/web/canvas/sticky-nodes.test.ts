import { describe, expect, it } from "vitest";
import { Board, boardId } from "../../../../../src/domain/board/board";
import { boardName } from "../../../../../src/domain/board/board-name";
import type { Sticky } from "../../../../../src/domain/board/sticky";
import { syncStickyNodes, type StickyNode } from "../../../../../src/presentation/web/canvas/sticky-nodes";

function sticky(id: string, overrides: Partial<Sticky> = {}): Sticky {
  return { id, kind: "DomainEvent", label: "", position: { x: 0, y: 0 }, notes: "", ...overrides };
}

function board(...stickies: Sticky[]): Board {
  return Board.restore({ id: boardId("b"), name: boardName("Tableau"), stickies, links: [], frames: [] });
}

describe("syncStickyNodes", () => {
  it("crée un nœud de taille fixe par post-it, à sa position, avec texte, couleur et nom du type", () => {
    const nodes = syncStickyNodes([], board(sticky("s1", { kind: "Policy", label: "Si payé", position: { x: 10, y: 20 } })));
    expect(nodes).toEqual([
      {
        id: "s1",
        type: "sticky",
        position: { x: 10, y: 20 },
        width: 160,
        height: 160,
        zIndex: 2,
        selected: false,
        ariaLabel: "Policy : Si payé",
        data: { kind: "Policy", kindName: "Policy", color: "purple", label: "Si payé", editing: false },
      },
    ]);
  });

  it("décrit un post-it vide par son seul type", () => {
    const [node] = syncStickyNodes([], board(sticky("s1", { kind: "Command" })));
    expect(node?.ariaLabel).toBe("Commande (vide)");
  });

  it("suit le tableau : position et texte à jour, post-its supprimés retirés, ordre du tableau", () => {
    const previous = syncStickyNodes([], board(sticky("s1"), sticky("s2")));
    const nodes = syncStickyNodes(previous, board(sticky("s3"), sticky("s1", { label: "Payé", position: { x: 5, y: 6 } })));
    expect(nodes.map((n) => [n.id, n.position, n.data.label])).toEqual([
      ["s3", { x: 0, y: 0 }, ""],
      ["s1", { x: 5, y: 6 }, "Payé"],
    ]);
  });

  it("conserve l'état propre à la vue (sélection, mesures) des nœuds existants", () => {
    const [first] = syncStickyNodes([], board(sticky("s1")));
    if (first === undefined) throw new Error("nœud attendu");
    const viewed: StickyNode = { ...first, selected: true, measured: { width: 160, height: 160 } };
    const [node] = syncStickyNodes([viewed], board(sticky("s1", { label: "x" })));
    expect(node?.selected).toBe(true);
    expect(node?.measured).toEqual({ width: 160, height: 160 });
  });

  it("met en édition le post-it édité, seul sélectionné", () => {
    const previous = syncStickyNodes([], board(sticky("s1"))).map((n) => ({ ...n, selected: true }));
    const nodes = syncStickyNodes(previous, board(sticky("s1"), sticky("s2")), "s2");
    expect(nodes.map((n) => [n.id, n.selected, n.data.editing])).toEqual([
      ["s1", false, false],
      ["s2", true, true],
    ]);
  });

  it("réutilise l'objet data inchangé pour que le rendu mémoïsé du post-it soit efficace", () => {
    const previous = syncStickyNodes([], board(sticky("s1", { label: "a" }), sticky("s2", { label: "b" })));
    const nodes = syncStickyNodes(previous, board(sticky("s1", { label: "a", position: { x: 9, y: 9 } }), sticky("s2", { label: "c" })));
    expect(nodes[0]?.data).toBe(previous[0]?.data);
    expect(nodes[1]?.data).not.toBe(previous[1]?.data);
  });

  it("réutilise le nœud précédent quand rien n'a changé", () => {
    const previous = syncStickyNodes([], board(sticky("s1")));
    expect(syncStickyNodes(previous, board(sticky("s1")))[0]).toBe(previous[0]);
  });

  it("place les post-its au-dessus des liens et des cadres", () => {
    const [node] = syncStickyNodes([], board(sticky("s1")));
    expect(node?.zIndex).toBe(2);
  });
});
