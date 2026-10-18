import { describe, expect, it } from "vitest";
import { BoardNotFoundError } from "../../../../src/application/ports/board-gateway";
import { boardId } from "../../../../src/domain/board/board";
import { HttpBoardGateway, HttpBoardGatewayError } from "../../../../src/infrastructure/http/http-board-gateway";

const id = boardId("b-1");

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function gatewayAnswering(response: Response | Error) {
  const calls: Call[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ url: String(input), init });
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  };
  return { gateway: new HttpBoardGateway("http://x", fetchFn), calls };
}

describe("HttpBoardGateway", () => {
  it("crée un tableau : POST /api/boards puis identifiant de la réponse 201", async () => {
    const { gateway, calls } = gatewayAnswering(Response.json({ id: "abc" }, { status: 201 }));
    expect(await gateway.create()).toBe("abc");
    expect(calls[0]?.url).toBe("http://x/api/boards");
    expect(calls[0]?.init?.method).toBe("POST");
  });

  it("rejette une création sans identifiant ou en erreur", async () => {
    await expect(gatewayAnswering(Response.json({}, { status: 201 })).gateway.create()).rejects.toBeInstanceOf(
      HttpBoardGatewayError,
    );
    await expect(gatewayAnswering(new Response(null, { status: 500 })).gateway.create()).rejects.toMatchObject({
      status: 500,
    });
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

  it.each([400, 413, 500])("rejette une réponse %i avec une erreur typée", async (status) => {
    const { gateway } = gatewayAnswering(new Response(null, { status }));
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toMatchObject({
      name: "HttpBoardGatewayError",
      status,
    });
    await expect(gateway.open(id)).rejects.toMatchObject({ status });
  });

  it("laisse remonter l'échec réseau", async () => {
    const { gateway } = gatewayAnswering(new TypeError("network"));
    await expect(gateway.pushUpdate(id, new Uint8Array([1]))).rejects.toThrow("network");
  });
});
