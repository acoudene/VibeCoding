import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_NAME, boardName } from "../../../../src/domain/board/board-name";
import { EmptyBoardNameError } from "../../../../src/domain/board/errors";

describe("boardName", () => {
  it("a pour défaut « Tableau sans titre »", () => expect(DEFAULT_BOARD_NAME).toBe("Tableau sans titre"));
  it("conserve un nom valide en retirant les espaces autour", () => expect(boardName("  Mon atelier ")).toBe("Mon atelier"));
  it.each(["", "   ", "\t\n"])("refuse le nom vide %j", (raw) => {
    expect(() => boardName(raw)).toThrow(EmptyBoardNameError);
    expect(() => boardName(raw)).toThrow("Le nom du tableau est obligatoire");
  });
});
