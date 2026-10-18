import { describe, expect, it } from "vitest";
import { BoardNotFoundError } from "../../../../../src/application/ports/board-gateway";
import type { BoardSync, SyncStatus } from "../../../../../src/application/ports/board-sync";
import { boardId, type BoardId } from "../../../../../src/domain/board/board";
import { boardName, type BoardName } from "../../../../../src/domain/board/board-name";
import {
  startBoardSession,
  type BoardSessionState,
  type OpenBoardPort,
} from "../../../../../src/presentation/web/hooks/board-session";

class FakeSync implements BoardSync {
  readonly calls: string[] = [];
  private listener: ((status: SyncStatus) => void) | undefined;
  constructor(readonly id: BoardId) {}
  status(): SyncStatus {
    return "saved";
  }
  onStatusChange(listener: (status: SyncStatus) => void) {
    this.listener = listener;
    return () => {
      this.calls.push("unsubscribe");
      this.listener = undefined;
    };
  }
  emit(status: SyncStatus) {
    this.listener?.(status);
  }
  flushWithBeacon() {
    this.calls.push("flush");
  }
  stop() {
    this.calls.push("stop");
  }
}

/** Ouverture pilotée par le test : chaque appel reste en attente jusqu'à `resolve` ou `reject`. */
class PendingOpen implements OpenBoardPort {
  readonly pending: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  execute(command: { id: string }) {
    return new Promise<{ id: BoardId; name: BoardName }>((resolve, reject) => {
      this.pending.push({
        resolve: () => resolve({ id: boardId(command.id), name: boardName(`Tableau ${command.id}`) }),
        reject,
      });
    });
  }
}

function setup() {
  const open = new PendingOpen();
  const syncs: FakeSync[] = [];
  const pageHide = new Set<() => void>();
  const states: BoardSessionState[] = [];
  const statuses: SyncStatus[] = [];
  const deps = {
    openBoard: open,
    startSync: (id: BoardId) => {
      const sync = new FakeSync(id);
      syncs.push(sync);
      return sync;
    },
    onPageHide: (listener: () => void) => {
      pageHide.add(listener);
      return () => {
        pageHide.delete(listener);
      };
    },
  };
  const listener = {
    onState: (state: BoardSessionState) => states.push(state),
    onSyncStatus: (status: SyncStatus) => statuses.push(status),
  };
  return { open, syncs, pageHide, states, statuses, start: (id: string) => startBoardSession(deps, id, listener) };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("startBoardSession", () => {
  it("ouvre le tableau, démarre sa synchronisation et relaie l'état d'enregistrement", async () => {
    const t = setup();
    t.start("a");
    expect(t.states).toEqual([{ phase: "loading" }]);
    t.open.pending[0]?.resolve();
    await settle();
    expect(t.states.at(-1)).toEqual({ phase: "open" });
    expect(t.syncs.map((s) => s.id)).toEqual(["a"]);
    t.syncs[0]?.emit("saving");
    expect(t.statuses).toEqual(["saved", "saving"]);
  });

  it("à la fermeture de la page, envoie ce qui reste en attente", async () => {
    const t = setup();
    t.start("a");
    t.open.pending[0]?.resolve();
    await settle();
    for (const listener of t.pageHide) listener();
    expect(t.syncs[0]?.calls).toEqual(["flush"]);
  });

  it("en quittant le tableau, envoie ce qui reste avant d'arrêter la synchronisation et cesse d'écouter la page", async () => {
    const t = setup();
    const close = t.start("a");
    t.open.pending[0]?.resolve();
    await settle();
    close();
    expect(t.syncs[0]?.calls).toEqual(["unsubscribe", "flush", "stop"]);
    expect(t.pageHide.size).toBe(0);
  });

  it("ignore une ouverture devenue obsolète : ni synchronisation ni changement d'état", async () => {
    const t = setup();
    const closeA = t.start("a");
    closeA();
    t.start("b");
    t.open.pending[1]?.resolve();
    await settle();
    t.open.pending[0]?.resolve();
    await settle();
    expect(t.syncs.map((s) => s.id)).toEqual(["b"]);
    expect(t.states).toEqual([{ phase: "loading" }, { phase: "loading" }, { phase: "open" }]);
  });

  it("signale un tableau introuvable", async () => {
    const t = setup();
    t.start("a");
    t.open.pending[0]?.reject(new BoardNotFoundError("a"));
    await settle();
    expect(t.states.at(-1)).toEqual({ phase: "notFound" });
  });

  it("signale un échec d'ouverture, sauf si la session est déjà fermée", async () => {
    const t = setup();
    t.start("a");
    t.open.pending[0]?.reject(new Error("réseau"));
    await settle();
    expect(t.states.at(-1)).toEqual({ phase: "failed" });
    const close = t.start("b");
    close();
    t.open.pending[1]?.reject(new Error("réseau"));
    await settle();
    expect(t.states.at(-1)).toEqual({ phase: "loading" });
  });
});
