import { BoardNotFoundError, type BoardGateway } from "../../application/ports/board-gateway";
import type { BoardEncodedState, BoardUpdate } from "../../application/ports/board-store";
import { boardId, type BoardId } from "../../domain/board/board";

/** Réponse HTTP inattendue du serveur (hors 404 d'un tableau inconnu). */
export class HttpBoardGatewayError extends Error {
  constructor(readonly status: number) {
    super(`Réponse inattendue du serveur (${status})`);
    this.name = "HttpBoardGatewayError";
  }
}

function hasStringId(body: unknown): body is { id: string } {
  return typeof body === "object" && body !== null && "id" in body && typeof body.id === "string";
}

const OCTET_STREAM = "application/octet-stream";

/** Appels HTTP vers l'API des tableaux ; `fetch` et l'URL de base sont injectés. */
export class HttpBoardGateway implements BoardGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch,
  ) {}

  async create(): Promise<BoardId> {
    const response = await this.fetchFn(`${this.baseUrl}/api/boards`, { method: "POST" });
    if (response.status !== 201) throw new HttpBoardGatewayError(response.status);
    const body: unknown = await response.json();
    if (!hasStringId(body)) throw new HttpBoardGatewayError(response.status);
    return boardId(body.id);
  }

  async open(id: BoardId): Promise<BoardEncodedState> {
    const response = await this.fetchFn(this.boardUrl(id));
    if (response.status === 404) throw new BoardNotFoundError(id);
    if (response.status !== 200) throw new HttpBoardGatewayError(response.status);
    return new Uint8Array(await response.arrayBuffer());
  }

  async pushUpdate(id: BoardId, update: BoardUpdate): Promise<void> {
    const response = await this.fetchFn(`${this.boardUrl(id)}/updates`, {
      method: "POST",
      headers: { "Content-Type": OCTET_STREAM },
      body: new Uint8Array(update),
    });
    if (response.status === 404) throw new BoardNotFoundError(id);
    if (!response.ok) throw new HttpBoardGatewayError(response.status);
  }

  private boardUrl(id: BoardId): string {
    return `${this.baseUrl}/api/boards/${encodeURIComponent(id)}`;
  }
}
