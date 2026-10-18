import { describe, expect, it } from "vitest";
import type { RenameBoardCommand } from "../../../../../src/application/board/rename-board";
import { EmptyBoardNameError } from "../../../../../src/domain/board/errors";
import { commitBoardName } from "../../../../../src/presentation/web/panels/board-name";
import { SAVE_STATUS_LABELS } from "../../../../../src/presentation/web/panels/save-status";
import { selectedElement } from "../../../../../src/presentation/web/panels/selection";

describe("selectedElement", () => {
  const nodes = [
    { id: "s1", type: "sticky", selected: false },
    { id: "f1", type: "frame", selected: false },
  ];
  const edges = [{ id: "l1", selected: false }];

  it("désigne l'unique élément sélectionné : post-it, cadre ou lien", () => {
    expect(selectedElement([{ id: "s1", type: "sticky", selected: true }], edges)).toEqual({ kind: "sticky", id: "s1" });
    expect(selectedElement([{ id: "f1", type: "frame", selected: true }], edges)).toEqual({ kind: "frame", id: "f1" });
    expect(selectedElement(nodes, [{ id: "l1", selected: true }])).toEqual({ kind: "link", id: "l1" });
  });

  it("n'en désigne aucun sans sélection ou avec plusieurs éléments sélectionnés", () => {
    expect(selectedElement(nodes, edges)).toBeUndefined();
    expect(
      selectedElement([{ id: "s1", type: "sticky", selected: true }], [{ id: "l1", selected: true }]),
    ).toBeUndefined();
  });
});

describe("commitBoardName", () => {
  function renameBoard(fail = false) {
    const commands: RenameBoardCommand[] = [];
    return {
      commands,
      execute(command: RenameBoardCommand) {
        if (fail) throw new EmptyBoardNameError();
        commands.push(command);
      },
    };
  }

  it("renomme le tableau par le cas d'usage", () => {
    const port = renameBoard();
    expect(commitBoardName(port, "Atelier paiement")).toBeUndefined();
    expect(port.commands).toEqual([{ name: "Atelier paiement" }]);
  });

  it("renvoie le message d'erreur du domaine quand le nom est vide", () => {
    expect(commitBoardName(renameBoard(true), "")).toBe("Le nom du tableau est obligatoire");
  });

  it("laisse passer les autres erreurs", () => {
    const failing = { execute: () => { throw new Error("panne"); } };
    expect(() => commitBoardName(failing, "x")).toThrow("panne");
  });
});

describe("SAVE_STATUS_LABELS", () => {
  it("libelle chaque état de la synchronisation (FR-004)", () => {
    expect(SAVE_STATUS_LABELS).toEqual({
      saved: "Enregistré",
      saving: "Enregistrement…",
      offline: "Hors ligne",
      error: "Erreur d'enregistrement",
    });
  });
});
