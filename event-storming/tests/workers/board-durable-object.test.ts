import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import type { BoardDurableObject } from "../../src/infrastructure/cloudflare/board-durable-object";

const MAX_UPDATE_BYTES = 1_048_576;

function board(name: string): DurableObjectStub<BoardDurableObject> {
  return env.BOARD.get(env.BOARD.idFromName(name)) as DurableObjectStub<BoardDurableObject>;
}

function metaName(state: Uint8Array | undefined): unknown {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state ?? new Uint8Array());
  return doc.getMap("meta").get("name");
}

function nameUpdate(name: string): Uint8Array {
  const doc = new Y.Doc();
  doc.getMap("meta").set("name", name);
  return Y.encodeStateAsUpdate(doc);
}

describe("BoardDurableObject", () => {
  it("un tableau non créé est inconnu (404)", async () => {
    const stub = board("inconnu");
    expect(await stub.getState()).toBeUndefined();
    expect(await stub.applyUpdate(new Uint8Array([0]))).toBe("NOT_FOUND");
  });

  it("à la création, l'état initial est un document Yjs vide", async () => {
    const stub = board("cree");
    await stub.create();
    const state = await stub.getState();
    expect(state).toBeInstanceOf(Uint8Array);
    expect(metaName(state)).toBeUndefined();
  });

  it("fusionne les mises à jour reçues dans l'état", async () => {
    const stub = board("fusion");
    await stub.create();
    expect(await stub.applyUpdate(nameUpdate("Mon tableau"))).toBe("OK");
    const other = new Y.Doc();
    other.getMap("stickies").set("s-1", "texte");
    expect(await stub.applyUpdate(Y.encodeStateAsUpdate(other))).toBe("OK");

    const merged = new Y.Doc();
    Y.applyUpdate(merged, (await stub.getState()) ?? new Uint8Array());
    expect(merged.getMap("meta").get("name")).toBe("Mon tableau");
    expect(merged.getMap("stickies").get("s-1")).toBe("texte");
  });

  it("n'écrit pas dans un autre tableau", async () => {
    const a = board("a");
    const b = board("b");
    await a.create();
    await b.create();
    await a.applyUpdate(nameUpdate("A"));
    expect(metaName(await b.getState())).toBeUndefined();
  });

  it("refuse une mise à jour de plus de 1 Mio (413) sans toucher à l'état", async () => {
    const stub = board("gros");
    await stub.create();
    const before = await stub.getState();
    expect(await stub.applyUpdate(new Uint8Array(MAX_UPDATE_BYTES + 1))).toBe("TOO_LARGE");
    expect(await stub.getState()).toEqual(before);
  });

  it("refuse une mise à jour illisible (400) sans toucher à l'état", async () => {
    const stub = board("illisible");
    await stub.create();
    const before = await stub.getState();
    expect(await stub.applyUpdate(new Uint8Array([255, 255, 255, 255, 1, 2, 3]))).toBe("UNREADABLE");
    expect(await stub.getState()).toEqual(before);
  });

  it("recréer un tableau existant n'écrase pas son état", async () => {
    const stub = board("recree");
    await stub.create();
    await stub.applyUpdate(nameUpdate("Garde"));
    await stub.create();
    expect(metaName(await stub.getState())).toBe("Garde");
  });
});
