import { describe, expect, it } from "vitest";
import { OpenBoard } from "../../../../src/application/board/open-board";
import { BoardNotFoundError, type BoardGateway } from "../../../../src/application/ports/board-gateway";
import type { BoardEncodedState } from "../../../../src/application/ports/board-store";
import { boardId, type BoardId } from "../../../../src/domain/board/board";
import { FixedClock } from "../../../../src/infrastructure/memory/fixed-clock";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { InMemoryRecentBoards } from "../../../../src/infrastructure/memory/in-memory-recent-boards";

const openedAt = new Date("2026-01-01T10:00:00Z");

/** Serveur dont chaque lecture reste en suspens jusqu'à `respond` : on choisit l'ordre des réponses. */
class SlowGateway implements Pick<BoardGateway, "open"> {
  private readonly waiting = new Map<BoardId, { resolve(state: BoardEncodedState): void; reject(error: unknown): void }>();
  open(id: BoardId): Promise<BoardEncodedState> {
    return new Promise((resolve, reject) => this.waiting.set(id, { resolve, reject }));
  }
  respond(id: string): void {
    this.waiting.get(boardId(id))?.resolve(new Uint8Array());
  }
  fail(id: string, error: unknown): void {
    this.waiting.get(boardId(id))?.reject(error);
  }
}

function setup() {
  const gateway = new SlowGateway();
  const store = new InMemoryBoardStore();
  const recentBoards = new InMemoryRecentBoards();
  const openBoard = new OpenBoard(gateway, store, recentBoards, new FixedClock(openedAt));
  return { gateway, store, recentBoards, openBoard };
}

describe("OpenBoard", () => {
  it("charge le tableau et l'inscrit dans les tableaux récents", async () => {
    const t = setup();
    const opening = t.openBoard.execute({ id: "a" });
    t.gateway.respond("a");
    expect(await opening).toEqual({ id: "a", name: "Tableau sans titre" });
    expect(t.store.current().id).toBe("a");
    expect(t.recentBoards.list()).toEqual([{ id: "a", name: "Tableau sans titre", openedAt }]);
  });

  it("une ouverture devenue obsolète (A lente, B rapide) ne remplace pas le tableau ouvert ni les récents", async () => {
    const t = setup();
    let current = "a";
    const openingA = t.openBoard.execute({ id: "a" }, { isCurrent: () => current === "a" });
    current = "b";
    const openingB = t.openBoard.execute({ id: "b" }, { isCurrent: () => current === "b" });
    t.gateway.respond("b");
    expect(await openingB).toEqual({ id: "b", name: "Tableau sans titre" });
    t.gateway.respond("a");
    expect(await openingA).toBeUndefined();
    expect(t.store.current().id).toBe("b");
    expect(t.recentBoards.list().map((r) => r.id)).toEqual(["b"]);
  });

  it("une ouverture abandonnée avant la réponse ne charge rien", async () => {
    const t = setup();
    let current = true;
    const opening = t.openBoard.execute({ id: "a" }, { isCurrent: () => current });
    current = false;
    t.gateway.respond("a");
    expect(await opening).toBeUndefined();
    expect(() => t.store.current()).toThrow();
    expect(t.recentBoards.list()).toEqual([]);
  });

  it("rejette un tableau introuvable sans toucher aux récents", async () => {
    const t = setup();
    const opening = t.openBoard.execute({ id: "a" });
    t.gateway.fail("a", new BoardNotFoundError("a"));
    await expect(opening).rejects.toBeInstanceOf(BoardNotFoundError);
    expect(t.recentBoards.list()).toEqual([]);
  });
});
