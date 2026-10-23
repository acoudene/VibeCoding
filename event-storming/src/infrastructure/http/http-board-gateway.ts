import {
  BoardGatewayUnavailableError,
  BoardNotFoundError,
  BoardUpdateRejectedError,
  type BoardGateway,
} from "../../application/ports/board-gateway";
import type { BoardEncodedState, BoardUpdate } from "../../application/ports/board-store";
import { boardId, type BoardId } from "../../domain/board/board";

export const DEFAULT_TIMEOUT_MS = 10_000;

/** Transitoire : 5xx, 408, 429 ; définitif : tout autre code inattendu (413 : tableau trop volumineux). */
function errorForStatus(status: number): Error {
  if (status >= 500 || status === 408 || status === 429) {
    return new BoardGatewayUnavailableError(`Réponse inattendue du serveur (${status})`);
  }
  return new BoardUpdateRejectedError(status === 413 ? "TOO_LARGE" : "REJECTED");
}

function hasStringId(body: unknown): body is { id: string } {
  return typeof body === "object" && body !== null && "id" in body && typeof body.id === "string";
}

const OCTET_STREAM = "application/octet-stream";

/**
 * Appels HTTP vers l'API des tableaux ; `fetch`, l'URL de base et le délai maximal par appel sont injectés.
 * Erreur réseau et délai dépassé : `BoardGatewayUnavailableError` (transitoire).
 */
export class HttpBoardGateway implements BoardGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async create(): Promise<BoardId> {
    const response = await this.request(`${this.baseUrl}/api/boards`, { method: "POST" });
    if (response.status !== 201) throw errorForStatus(response.status);
    const body = await this.readJson(response);
    if (!hasStringId(body)) throw new BoardGatewayUnavailableError("Réponse illisible du serveur");
    return boardId(body.id);
  }

  async open(id: BoardId): Promise<BoardEncodedState> {
    const response = await this.request(this.boardUrl(id), {});
    if (response.status === 404) throw new BoardNotFoundError(id);
    if (response.status !== 200) throw errorForStatus(response.status);
    return new Uint8Array(await this.read(response, (r) => r.arrayBuffer()));
  }

  async pushUpdate(id: BoardId, update: BoardUpdate): Promise<void> {
    const response = await this.request(`${this.boardUrl(id)}/updates`, {
      method: "POST",
      headers: { "Content-Type": OCTET_STREAM },
      body: new Uint8Array(update),
    });
    if (response.status === 404) throw new BoardNotFoundError(id);
    if (!response.ok) throw errorForStatus(response.status);
  }

  /** `fetch` borné dans le temps ; toute erreur réseau ou abandon devient `BoardGatewayUnavailableError`. */
  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch {
      throw new BoardGatewayUnavailableError();
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    return this.read(response, (r) => r.json() as Promise<unknown>);
  }

  /** Lecture du corps : une coupure en cours de lecture est aussi transitoire. */
  private async read<T>(response: Response, reader: (r: Response) => Promise<T>): Promise<T> {
    try {
      return await reader(response);
    } catch {
      throw new BoardGatewayUnavailableError();
    }
  }

  private boardUrl(id: BoardId): string {
    return `${this.baseUrl}/api/boards/${encodeURIComponent(id)}`;
  }
}
