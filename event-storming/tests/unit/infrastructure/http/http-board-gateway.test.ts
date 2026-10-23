import { describe, expect, it } from "vitest";
import {
  BoardGatewayUnavailableError,
  BoardNotFoundError,
  BoardUpdateRejectedError,
} from "../../../../src/application/ports/board-gateway";
import { boardId } from "../../../../src/domain/board/board";
import { HttpBoardGateway } from "../../../../src/infrastructure/http/http-board-gateway";

const id = boardId("b-1");

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function gatewayAnswering(response: Response | Error, timeoutMs?: number) {
  const calls: Call[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ url: String(input), init });
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  };
  return { gateway: new HttpBoardGateway("http://x", fetchFn, timeoutMs), calls };
}

describe("HttpBoardGateway", () => {
  it("crée un tableau : POST /api/boards puis identifiant de la réponse 201", async () => {
    const { gateway, calls } = gatewayAnswering(Response.json({ id: "abc" }, { status: 201 }));
    expect(await gateway.create()).toBe("abc");
    expect(calls[0]?.url).toBe("http://x/api/boards");
    expect(calls[0]?.init?.method).toBe("POST");
  });

  it("rejette une création sans identifiant (indisponible) ou en erreur", async () => {
    await expect(gatewayAnswering(Response.json({}, { status: 201 })).gateway.create()).rejects.toBeInstanceOf(
      BoardGatewayUnavailableError,
    );
    await expect(gatewayAnswering(new Response(null, { status: 500 })).gateway.create()).rejects.toBeInstanceOf(
      BoardGatewayUnavailableError,
    );
  });

  it("ouvre un tableau : GET et octets de la réponse", async () => {
    const { gateway, calls } = gatewayAnswering(new Response(new Uint8Array([1, 2, 3])));
    expect(await gateway.open(id)).toEqual(new Uint8Array([1, 2, 3]));
    expect(calls[0]?.url).toBe("http://x/api/boards/b-1");
  });

  it("traduit 404 en BoardNotFoundError à l'ouverture et à l'envoi", async () => {
    const notFound = () => new Response(JSON.stringify({ error: "BOARD_NOT_FOUND" }), { status: 404 });
    await expect(gatewayAnswering(notFound()).gateway.open(id)).rejects.toBeInstanceOf(BoardNotFoundError);
    await expect(gatewayAnswering(notFound()).gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toBeInstanceOf(
      BoardNotFoundError,
    );
  });

  it("envoie une mise à jour : POST octet-stream, 204 accepté", async () => {
    const { gateway, calls } = gatewayAnswering(new Response(null, { status: 204 }));
    await gateway.pushUpdate(id, new Uint8Array([9]));
    expect(calls[0]?.url).toBe("http://x/api/boards/b-1/updates");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toEqual({ "Content-Type": "application/octet-stream" });
    expect(calls[0]?.init?.body).toEqual(new Uint8Array([9]));
  });

  it.each([408, 429, 500, 503])("traduit %i en erreur transitoire", async (status) => {
    const { gateway } = gatewayAnswering(new Response(null, { status }));
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
    await expect(gateway.open(id)).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
  });

  it.each([400, 403, 413])("traduit %i en refus définitif", async (status) => {
    const { gateway } = gatewayAnswering(new Response(null, { status }));
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toBeInstanceOf(BoardUpdateRejectedError);
    await expect(gateway.open(id)).rejects.toBeInstanceOf(BoardUpdateRejectedError);
  });

  it("distingue le tableau trop volumineux (413)", async () => {
    const { gateway } = gatewayAnswering(new Response(null, { status: 413 }));
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toMatchObject({ reason: "TOO_LARGE" });
  });

  it("traduit l'échec réseau en erreur transitoire", async () => {
    const { gateway } = gatewayAnswering(new TypeError("network"));
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
    await expect(gateway.create()).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
    await expect(gateway.open(id)).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
  });

  it("transmet un signal d'abandon à chaque appel", async () => {
    const { gateway, calls } = gatewayAnswering(new Response(null, { status: 204 }));
    await gateway.pushUpdate(id, new Uint8Array([1]));
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("traduit un délai dépassé en erreur transitoire", async () => {
    const fetchFn: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const gateway = new HttpBoardGateway("http://x", fetchFn, 10);
    await expect(gateway.open(id)).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toBeInstanceOf(BoardGatewayUnavailableError);
  });
});
