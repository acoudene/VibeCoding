import { describe, expect, it } from "vitest";
import type { OpenBoardOptions } from "../../../../../src/application/board/open-board";
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
  current: SyncStatus = "saved";
  private listener: ((status: SyncStatus) => void) | undefined;
  constructor(
    readonly id: BoardId,
    readonly calls: string[],
  ) {}
  status(): SyncStatus {
    return this.current;
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

/**
 * Ouverture pilotée par le test : chaque appel reste en attente jusqu'à `resolve` ou `reject`. Comme `OpenBoard`,
 * une ouverture obsolète à la réponse (`isCurrent()` faux) ne charge rien : `undefined`.
 */
class PendingOpen implements OpenBoardPort {
  readonly pending: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  readonly loaded: string[] = [];
  execute(command: { id: string }, options: OpenBoardOptions) {
    return new Promise<{ id: BoardId; name: BoardName } | undefined>((resolve, reject) => {
      this.pending.push({
        resolve: () => {
          if (!options.isCurrent()) return resolve(undefined);
          this.loaded.push(command.id);
          resolve({ id: boardId(command.id), name: boardName(`Tableau ${command.id}`) });
        },
        reject,
      });
    });
  }
}

function setup() {
  const open = new PendingOpen();
  const calls: string[] = [];
  const syncs: FakeSync[] = [];
  const pageHidden = new Set<() => void>();
  const beforeUnload = new Set<() => boolean>();
  const states: BoardSessionState[] = [];
  const statuses: SyncStatus[] = [];
  const deps = {
    openBoard: open,
    startSync: (id: BoardId) => {
      const sync = new FakeSync(id, calls);
      syncs.push(sync);
      return sync;
    },
    page: {
      onHidden: (listener: () => void) => {
        pageHidden.add(listener);
        return () => {
          pageHidden.delete(listener);
        };
      },
      onBeforeUnload: (listener: () => boolean) => {
        beforeUnload.add(listener);
        return () => {
          beforeUnload.delete(listener);
        };
      },
    },
    commitOpenEditor: () => {
      calls.push("commit");
      onCommit();
    },
  };
  let onCommit = () => {};
  const listener = {
    onState: (state: BoardSessionState) => states.push(state),
    onSyncStatus: (status: SyncStatus) => statuses.push(status),
  };
  return {
    open,
    calls,
    syncs,
    pageHidden,
    beforeUnload,
    states,
    statuses,
    /** Ce que fait la validation de l'éditeur ouvert (par défaut : rien à valider). */
    whenCommitting: (effect: () => void) => {
      onCommit = effect;
    },
    start: (id: string) => startBoardSession(deps, id, listener),
  };
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

  it("quand la page est masquée ou fermée, valide l'éditeur ouvert puis envoie ce qui reste en attente", async () => {
    const t = setup();
    t.start("a");
    t.open.pending[0]?.resolve();
    await settle();
    for (const listener of t.pageHidden) listener();
    expect(t.calls).toEqual(["commit", "flush"]);
  });

  it("avant de quitter, valide l'éditeur ouvert et demande confirmation si quelque chose n'est pas enregistré", async () => {
    const t = setup();
    t.start("a");
    t.open.pending[0]?.resolve();
    await settle();
    const sync = t.syncs[0];
    const confirmLeave = () => [...t.beforeUnload].some((listener) => listener());
    expect(confirmLeave()).toBe(false);
    expect(t.calls).toEqual(["commit"]);
    // Un texte en cours de saisie, une fois validé, part en enregistrement : il faut prévenir.
    t.whenCommitting(() => {
      if (sync) sync.current = "saving";
    });
    expect(confirmLeave()).toBe(true);
  });

  it("en quittant le tableau, envoie ce qui reste avant d'arrêter la synchronisation et cesse d'écouter la page", async () => {
    const t = setup();
    const close = t.start("a");
    t.open.pending[0]?.resolve();
    await settle();
    close();
    expect(t.calls).toEqual(["unsubscribe", "flush", "stop"]);
    expect(t.pageHidden.size).toBe(0);
    expect(t.beforeUnload.size).toBe(0);
  });

  it("ignore une ouverture devenue obsolète : rien de chargé, ni synchronisation ni changement d'état", async () => {
    const t = setup();
    const closeA = t.start("a");
    closeA();
    t.start("b");
    t.open.pending[1]?.resolve();
    await settle();
    t.open.pending[0]?.resolve();
    await settle();
    expect(t.open.loaded).toEqual(["b"]);
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
