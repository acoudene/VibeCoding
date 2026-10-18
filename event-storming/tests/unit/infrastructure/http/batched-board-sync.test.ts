import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { BoardGateway } from "../../../../src/application/ports/board-gateway";
import type { BoardUpdate } from "../../../../src/application/ports/board-store";
import type { SyncStatus } from "../../../../src/application/ports/board-sync";
import { boardId } from "../../../../src/domain/board/board";
import { BatchedBoardSync } from "../../../../src/infrastructure/http/batched-board-sync";

const id = boardId("b-1");

/** Produit de vraies mises à jour Yjs : une par appel à `edit`. */
function updatesSource() {
  const doc = new Y.Doc();
  const map = doc.getMap<number>("m");
  const listeners = new Set<(u: BoardUpdate) => void>();
  doc.on("update", (u: Uint8Array) => listeners.forEach((l) => l(u)));
  let n = 0;
  return {
    edit: () => map.set(`k${n++}`, n),
    store: {
      onUpdate(listener: (u: BoardUpdate) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    listenerCount: () => listeners.size,
  };
}

/** Passerelle dont chaque envoi reste en suspens jusqu'à `settle`. */
function controlledGateway() {
  const sent: BoardUpdate[] = [];
  const pending: { resolve(): void; reject(e: Error): void }[] = [];
  const gateway: Pick<BoardGateway, "pushUpdate"> = {
    pushUpdate: (_id, update) => {
      sent.push(update);
      return new Promise<void>((resolve, reject) => pending.push({ resolve, reject }));
    },
  };
  const settle = async (i: number, outcome: "ok" | "fail") => {
    const p = pending[i];
    if (!p) throw new Error(`no send #${i}`);
    if (outcome === "ok") p.resolve();
    else p.reject(new Error("offline"));
    await vi.advanceTimersByTimeAsync(0);
  };
  return { gateway, sent, settle };
}

function docFrom(updates: readonly BoardUpdate[]): Y.Doc {
  const doc = new Y.Doc();
  updates.forEach((u) => Y.applyUpdate(doc, u));
  return doc;
}

function size(updates: readonly BoardUpdate[]): number {
  return docFrom(updates).getMap("m").size;
}

function setup(sendBeacon?: (url: string, data: Blob) => boolean) {
  const source = updatesSource();
  const g = controlledGateway();
  const sync = new BatchedBoardSync({
    boardId: id,
    store: source.store,
    gateway: g.gateway,
    beaconUrl: "/api/boards/b-1/updates",
    ...(sendBeacon ? { sendBeacon } : {}),
  });
  const statuses: SyncStatus[] = [];
  sync.onStatusChange((s) => statuses.push(s));
  return { source, g, sync, statuses };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("BatchedBoardSync", () => {
  it("est « Enregistré » tant que rien n'est modifié", () => {
    expect(setup().sync.status()).toBe("saved");
  });

  it("regroupe les modifications d'une fenêtre de 500 ms en un seul envoi fusionné", async () => {
    const { source, g, sync } = setup();
    source.edit();
    await vi.advanceTimersByTimeAsync(300);
    source.edit();
    expect(sync.status()).toBe("saving");
    await vi.advanceTimersByTimeAsync(199);
    expect(g.sent).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(g.sent).toHaveLength(1);
    expect(size(g.sent)).toBe(2);
  });

  it("repasse à « Enregistré » après un envoi réussi, en notifiant chaque changement", async () => {
    const { source, g, sync, statuses } = setup();
    source.edit();
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    expect(sync.status()).toBe("saving");
    await g.settle(0, "ok");
    expect(sync.status()).toBe("saved");
    expect(statuses).toEqual(["saving", "saved"]);
  });

  it("ne perd ni ne réordonne les modifications faites pendant un envoi", async () => {
    const { source, g, sync } = setup();
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    source.edit();
    await vi.advanceTimersByTimeAsync(1000);
    expect(g.sent).toHaveLength(1);
    await g.settle(0, "ok");
    expect(sync.status()).toBe("saving");
    await vi.advanceTimersByTimeAsync(500);
    expect(g.sent).toHaveLength(2);
    await g.settle(1, "ok");
    expect(sync.status()).toBe("saved");
    expect(size(g.sent)).toBe(2);
    expect(size([g.sent[0] as BoardUpdate])).toBe(1);
  });

  it("passe « Hors ligne » sur échec puis réessaie à 500 ms, 1 s, 2 s… plafonné à 10 s", async () => {
    const { source, g, sync } = setup();
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    let attempt = 0;
    for (const delay of [500, 1000, 2000, 4000, 8000, 10000, 10000]) {
      await g.settle(attempt, "fail");
      expect(sync.status()).toBe("offline");
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(g.sent).toHaveLength(attempt + 1);
      await vi.advanceTimersByTimeAsync(1);
      attempt += 1;
      expect(g.sent).toHaveLength(attempt + 1);
    }
  });

  it("renvoie la même modification, plus celles arrivées entre-temps, après un échec", async () => {
    const { source, g, sync } = setup();
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    source.edit();
    await g.settle(0, "fail");
    await vi.advanceTimersByTimeAsync(500);
    expect(g.sent).toHaveLength(2);
    expect(size([g.sent[1] as BoardUpdate])).toBe(2);
    await g.settle(1, "ok");
    expect(sync.status()).toBe("saved");
  });

  it("repart de l'attente de 500 ms après un succès", async () => {
    const { source, g } = setup();
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    await g.settle(0, "fail");
    await vi.advanceTimersByTimeAsync(500);
    await g.settle(1, "fail");
    await vi.advanceTimersByTimeAsync(1000);
    await g.settle(2, "ok");
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    expect(g.sent).toHaveLength(4);
    await g.settle(3, "fail");
    await vi.advanceTimersByTimeAsync(500);
    expect(g.sent).toHaveLength(5);
  });

  it("flushWithBeacon envoie ce qui reste via sendBeacon et considère l'état enregistré", () => {
    const beacon = vi.fn((_url: string, _data: Blob) => true);
    const { source, g, sync } = setup(beacon);
    source.edit();
    source.edit();
    sync.flushWithBeacon();
    expect(beacon).toHaveBeenCalledOnce();
    const [url, blob] = beacon.mock.calls[0] as [string, Blob];
    expect(url).toBe("/api/boards/b-1/updates");
    expect(blob.type).toBe("application/octet-stream");
    expect(sync.status()).toBe("saved");
    vi.advanceTimersByTime(5000);
    expect(g.sent).toHaveLength(0);
  });

  it("flushWithBeacon garde l'attente si sendBeacon refuse", async () => {
    const { source, g, sync } = setup(() => false);
    source.edit();
    sync.flushWithBeacon();
    expect(sync.status()).toBe("saving");
    await vi.advanceTimersByTimeAsync(500);
    expect(g.sent).toHaveLength(1);
  });

  it("flushWithBeacon inclut l'envoi en cours, dont l'issue est encore inconnue", async () => {
    const beacon = vi.fn((_url: string, _data: Blob) => true);
    const { source, g, sync } = setup(beacon);
    source.edit();
    await vi.advanceTimersByTimeAsync(500);
    source.edit();
    sync.flushWithBeacon();
    const blob = beacon.mock.calls[0]?.[1] as Blob;
    expect(size([new Uint8Array(await blob.arrayBuffer())])).toBe(2);
    expect(g.sent).toHaveLength(1);
  });

  it("flushWithBeacon sans rien en attente n'appelle pas sendBeacon", () => {
    const beacon = vi.fn(() => true);
    setup(beacon).sync.flushWithBeacon();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("stop cesse d'écouter et abandonne les envois prévus", async () => {
    const { source, g, sync } = setup();
    source.edit();
    sync.stop();
    expect(source.listenerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(g.sent).toHaveLength(0);
  });

  it("onStatusChange se désabonne", () => {
    const { source, sync } = setup();
    const seen: SyncStatus[] = [];
    const off = sync.onStatusChange((s) => seen.push(s));
    off();
    source.edit();
    expect(seen).toEqual([]);
  });
});
