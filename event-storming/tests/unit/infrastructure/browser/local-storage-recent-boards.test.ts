import { describe, expect, it } from "vitest";
import { boardId } from "../../../../src/domain/board/board";
import { LocalStorageRecentBoards } from "../../../../src/infrastructure/browser/local-storage-recent-boards";
import { describeRecentBoardsContract } from "../recent-boards-contract";

class FakeStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function unavailable(): never {
  throw new Error("indisponible");
}

/** Stockage indisponible (mode privé, quota, accès refusé) : chaque accès lève. */
const brokenStorage: Storage = {
  get length(): number {
    return unavailable();
  },
  clear: unavailable,
  getItem: unavailable,
  key: unavailable,
  removeItem: unavailable,
  setItem: unavailable,
};

describeRecentBoardsContract("LocalStorageRecentBoards", () => new LocalStorageRecentBoards(new FakeStorage()));

describe("LocalStorageRecentBoards", () => {
  it("écrit la liste sous la clé es:recent-boards", () => {
    const storage = new FakeStorage();
    new LocalStorageRecentBoards(storage).touch({
      id: boardId("b-1"),
      name: "Mon tableau",
      openedAt: new Date("2026-10-18T09:00:00Z"),
    });
    expect(JSON.parse(storage.getItem("es:recent-boards") ?? "null")).toEqual([
      { id: "b-1", name: "Mon tableau", openedAt: "2026-10-18T09:00:00.000Z" },
    ]);
  });

  it("partage la liste entre deux instances sur le même stockage", () => {
    const storage = new FakeStorage();
    new LocalStorageRecentBoards(storage).touch({
      id: boardId("b-1"),
      name: "Mon tableau",
      openedAt: new Date("2026-10-18T09:00:00Z"),
    });
    expect(new LocalStorageRecentBoards(storage).list().map((e) => e.id)).toEqual(["b-1"]);
  });

  it("stockage indisponible : liste vide, aucune erreur", () => {
    const recents = new LocalStorageRecentBoards(brokenStorage);
    expect(recents.list()).toEqual([]);
    expect(() =>
      recents.touch({ id: boardId("b-1"), name: "X", openedAt: new Date("2026-10-18T09:00:00Z") }),
    ).not.toThrow();
    expect(() => recents.forget(boardId("b-1"))).not.toThrow();
  });

  it.each([
    ["JSON illisible", "{pas du json"],
    ["pas un tableau", '{"id":"b-1"}'],
  ])("contenu corrompu (%s) : liste vide", (_label, raw) => {
    const storage = new FakeStorage();
    storage.setItem("es:recent-boards", raw);
    expect(new LocalStorageRecentBoards(storage).list()).toEqual([]);
  });

  it("ignore les entrées invalides et garde les valides", () => {
    const storage = new FakeStorage();
    storage.setItem(
      "es:recent-boards",
      JSON.stringify([
        { id: "b-1", name: "Valide", openedAt: "2026-10-18T09:00:00.000Z" },
        { id: "", name: "Sans id", openedAt: "2026-10-18T09:00:00.000Z" },
        { id: "b-2", name: "Date foireuse", openedAt: "pas une date" },
        { id: "b-3", name: 42, openedAt: "2026-10-18T09:00:00.000Z" },
        null,
      ]),
    );
    expect(new LocalStorageRecentBoards(storage).list().map((e) => e.id)).toEqual(["b-1"]);
  });

  it("sans stockage disponible (hors navigateur) : liste vide, aucune erreur", () => {
    expect(new LocalStorageRecentBoards(undefined).list()).toEqual([]);
  });
});
