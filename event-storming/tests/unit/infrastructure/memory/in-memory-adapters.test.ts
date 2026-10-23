import { describe, expect, it } from "vitest";
import { BoardNotFoundError } from "../../../../src/application/ports/board-gateway";
import { boardId } from "../../../../src/domain/board/board";
import { FixedClock } from "../../../../src/infrastructure/memory/fixed-clock";
import { InMemoryBoardGateway } from "../../../../src/infrastructure/memory/in-memory-board-gateway";
import { InMemoryRecentBoards } from "../../../../src/infrastructure/memory/in-memory-recent-boards";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

describe("ScriptedIdGenerator", () => {
  it("donne d'abord les identifiants annoncés, puis une suite déterministe", () => {
    const ids = new ScriptedIdGenerator();
    ids.enqueue("b-7f3a9c2e");
    expect([ids.next(), ids.next(), ids.next()]).toEqual(["b-7f3a9c2e", "id-1", "id-2"]);
  });
});

describe("FixedClock", () => {
  it("donne l'instant fixé", () => {
    const clock = new FixedClock(new Date("2026-10-18T10:00:00Z"));
    clock.setNow(new Date("2026-10-18T11:00:00Z"));
    expect(clock.now().toISOString()).toBe("2026-10-18T11:00:00.000Z");
  });
});

describe("InMemoryBoardGateway", () => {
  it("crée un tableau à l'état vide", async () => {
    const ids = new ScriptedIdGenerator();
    ids.enqueue("b-1");
    const gateway = new InMemoryBoardGateway(ids);
    const id = await gateway.create();
    expect(id).toBe("b-1");
    expect(await gateway.open(id)).toEqual(new Uint8Array());
  });

  it("conserve la dernière mise à jour reçue", async () => {
    const gateway = new InMemoryBoardGateway(new ScriptedIdGenerator());
    const id = await gateway.create();
    await gateway.pushUpdate(id, new Uint8Array([1, 2]));
    expect(await gateway.open(id)).toEqual(new Uint8Array([1, 2]));
  });

  it("signale un tableau inconnu", async () => {
    const gateway = new InMemoryBoardGateway(new ScriptedIdGenerator());
    await expect(gateway.open(boardId("b-inconnu"))).rejects.toThrow(BoardNotFoundError);
    await expect(gateway.open(boardId("b-inconnu"))).rejects.toThrow("Tableau introuvable");
    await expect(gateway.pushUpdate(boardId("b-inconnu"), new Uint8Array())).rejects.toThrow(BoardNotFoundError);
  });
});

describe("InMemoryRecentBoards", () => {
  const a = boardId("b-a");
  const b = boardId("b-b");

  it("liste du plus récent au plus ancien, un seul exemplaire par tableau", () => {
    const recent = new InMemoryRecentBoards();
    recent.touch({ id: a, name: "A", openedAt: new Date("2026-10-18T10:00:00Z") });
    recent.touch({ id: b, name: "B", openedAt: new Date("2026-10-18T11:00:00Z") });
    recent.touch({ id: a, name: "A renommé", openedAt: new Date("2026-10-18T12:00:00Z") });
    expect(recent.list().map((r) => r.name)).toEqual(["A renommé", "B"]);
  });

  it("oublie un tableau", () => {
    const recent = new InMemoryRecentBoards();
    recent.touch({ id: a, name: "A", openedAt: new Date("2026-10-18T10:00:00Z") });
    recent.forget(a);
    expect(recent.list()).toEqual([]);
  });
});
