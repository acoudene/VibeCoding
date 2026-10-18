import { describe, expect, it } from "vitest";
import { boardId } from "../../../../src/domain/board/board";
import { LocalStorageViewports } from "../../../../src/infrastructure/browser/local-storage-viewports";
import { brokenStorage, FakeStorage } from "./fake-storage";

const id = boardId("b-1");

describe("LocalStorageViewports", () => {
  it("mémorise la vue d'un tableau sous la clé es:viewport:<id> et la relit", () => {
    const storage = new FakeStorage();
    new LocalStorageViewports(storage).save(id, { x: 12, y: -30, zoom: 0.8 });
    expect(JSON.parse(storage.getItem("es:viewport:b-1") ?? "null")).toEqual({ x: 12, y: -30, zoom: 0.8 });
    expect(new LocalStorageViewports(storage).load(id)).toEqual({ x: 12, y: -30, zoom: 0.8 });
  });

  it("garde une vue par tableau", () => {
    const viewports = new LocalStorageViewports(new FakeStorage());
    viewports.save(id, { x: 1, y: 2, zoom: 1 });
    expect(viewports.load(boardId("b-2"))).toBeUndefined();
  });

  it("ignore une vue absente ou invalide (JSON illisible, champ manquant, zoom nul ou non fini)", () => {
    const storage = new FakeStorage();
    const viewports = new LocalStorageViewports(storage);
    expect(viewports.load(id)).toBeUndefined();
    for (const raw of ["{", "null", '{"x":1,"y":2}', '{"x":1,"y":2,"zoom":0}', '{"x":"1","y":2,"zoom":1}', "[1,2,1]"]) {
      storage.setItem("es:viewport:b-1", raw);
      expect(viewports.load(id)).toBeUndefined();
    }
  });

  it("ne lève jamais quand le stockage est indisponible", () => {
    const viewports = new LocalStorageViewports(brokenStorage);
    expect(() => viewports.save(id, { x: 0, y: 0, zoom: 1 })).not.toThrow();
    expect(viewports.load(id)).toBeUndefined();
  });
});
