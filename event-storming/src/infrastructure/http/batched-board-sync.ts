import * as Y from "yjs";
import { BoardNotFoundError, type BoardGateway } from "../../application/ports/board-gateway";
import type { BoardStore, BoardUpdate, Unsubscribe } from "../../application/ports/board-store";
import type { BoardSync, SyncStatus } from "../../application/ports/board-sync";
import type { BoardId } from "../../domain/board/board";
import { HttpBoardGatewayError } from "./http-board-gateway";

export const BATCH_WINDOW_MS = 500;
export const MAX_RETRY_DELAY_MS = 10_000;

/** Échec qui peut se résoudre en réessayant : réseau, 5xx, 408, 429. Les autres refus sont définitifs. */
function isTransient(error: unknown): boolean {
  if (error instanceof BoardNotFoundError) return false;
  if (error instanceof HttpBoardGatewayError) {
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }
  return true;
}

export interface BatchedBoardSyncOptions {
  boardId: BoardId;
  store: Pick<BoardStore, "onUpdate">;
  gateway: Pick<BoardGateway, "pushUpdate">;
  /** URL de `POST /api/boards/:id/updates`, pour `sendBeacon`. */
  beaconUrl: string;
  /** `navigator.sendBeacon` ; renvoie `false` si le navigateur refuse la mise en file. */
  sendBeacon?: (url: string, data: Blob) => boolean;
}

/**
 * Regroupe les mises à jour locales d'un tableau (`Y.mergeUpdates`) et les envoie au plus toutes les 500 ms ;
 * en cas d'échec, nouvel essai à 500 ms, 1 s, 2 s… plafonné à 10 s. Un seul envoi à la fois : l'ordre est conservé
 * et rien n'est perdu (une mise à jour échouée est renvoyée avec celles arrivées depuis). Les minuteries sont
 * celles de l'environnement (`setTimeout`), remplaçables par de faux timers en test.
 */
export class BatchedBoardSync implements BoardSync {
  private readonly pending: BoardUpdate[] = [];
  private inFlight: BoardUpdate | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private failures = 0;
  private current: SyncStatus = "saved";
  private stopped = false;
  private readonly listeners = new Set<(status: SyncStatus) => void>();
  private readonly unsubscribe: Unsubscribe;

  constructor(private readonly options: BatchedBoardSyncOptions) {
    this.unsubscribe = options.store.onUpdate((update) => this.enqueue(update));
  }

  status(): SyncStatus {
    return this.current;
  }

  onStatusChange(listener: (status: SyncStatus) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  flushWithBeacon(): void {
    const { sendBeacon, beaconUrl } = this.options;
    const unsent = this.inFlight ? [this.inFlight, ...this.pending] : [...this.pending];
    if (this.stopped || this.current === "error" || !sendBeacon || unsent.length === 0) return;
    // Fusion idempotente côté serveur : renvoyer l'envoi en cours est sans effet s'il a abouti.
    const payload = Y.mergeUpdates(unsent);
    if (!sendBeacon(beaconUrl, new Blob([new Uint8Array(payload)], { type: "application/octet-stream" }))) return;
    this.pending.length = 0;
    this.clearTimer();
    if (!this.inFlight) this.setStatus("saved");
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribe();
    this.clearTimer();
  }

  private enqueue(update: BoardUpdate): void {
    if (this.stopped) return;
    this.pending.push(update);
    if (this.current === "error") return;
    if (this.current === "saved") this.setStatus("saving");
    if (this.timer === undefined && !this.inFlight) this.schedule(BATCH_WINDOW_MS);
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.send();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async send(): Promise<void> {
    if (this.stopped || this.inFlight || this.pending.length === 0) return;
    const batch = Y.mergeUpdates(this.pending.splice(0));
    this.inFlight = batch;
    try {
      await this.options.gateway.pushUpdate(this.options.boardId, batch);
    } catch (error) {
      this.inFlight = undefined;
      if (this.stopped) return;
      this.pending.unshift(batch);
      if (!isTransient(error)) {
        this.setStatus("error");
        return;
      }
      this.failures += 1;
      this.setStatus("offline");
      this.schedule(Math.min(BATCH_WINDOW_MS * 2 ** (this.failures - 1), MAX_RETRY_DELAY_MS));
      return;
    }
    this.inFlight = undefined;
    if (this.stopped) return;
    this.failures = 0;
    if (this.pending.length > 0) {
      this.setStatus("saving");
      this.schedule(BATCH_WINDOW_MS);
    } else {
      this.setStatus("saved");
    }
  }

  private setStatus(status: SyncStatus): void {
    if (status === this.current) return;
    this.current = status;
    [...this.listeners].forEach((listener) => listener(status));
  }
}
