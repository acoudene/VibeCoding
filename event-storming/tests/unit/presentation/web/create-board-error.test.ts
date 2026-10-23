import { describe, expect, it } from "vitest";
import { BoardGatewayUnavailableError, BoardUpdateRejectedError } from "../../../../src/application/ports/board-gateway";
import { createBoardErrorMessage } from "../../../../src/presentation/web/create-board-error";

describe("createBoardErrorMessage", () => {
  it("invite à réessayer quand le serveur est injoignable (transitoire)", () => {
    expect(createBoardErrorMessage(new BoardGatewayUnavailableError())).toBe("Serveur injoignable, réessayez.");
  });

  it("signale un refus définitif sans inviter à réessayer", () => {
    expect(createBoardErrorMessage(new BoardUpdateRejectedError())).toBe(
      "Le serveur a refusé la création du tableau.",
    );
  });

  it("reste générique pour toute autre erreur", () => {
    expect(createBoardErrorMessage(new Error("x"))).toBe("Impossible de créer le tableau.");
  });
});
