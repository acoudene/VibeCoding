import { describe, expect, it } from "vitest";
import { STICKY_KINDS } from "../../../../src/domain/board/sticky-kind";
import { stickyColorVar, stickyKindItems } from "../../../../src/presentation/web/sticky-kinds";

describe("stickyKindItems", () => {
  it("présente les 9 types dans l'ordre du domaine, avec leur nom français et leur couleur dérivée", () => {
    expect(stickyKindItems().map((item) => [item.kind, item.name, item.color])).toEqual([
      ["DomainEvent", "Événement", "orange"],
      ["Command", "Commande", "blue"],
      ["Actor", "Acteur", "paleYellow"],
      ["Aggregate", "Agrégat", "yellow"],
      ["Policy", "Policy", "purple"],
      ["ReadModel", "Read model", "green"],
      ["ExternalSystem", "Système externe", "pink"],
      ["Hotspot", "Hotspot", "red"],
      ["Rule", "Règle", "grey"],
    ]);
    expect(stickyKindItems()).toHaveLength(STICKY_KINDS.length);
  });
});

describe("stickyColorVar", () => {
  it("référence la propriété CSS de la couleur, en kebab-case", () => {
    expect(stickyColorVar("orange")).toBe("var(--sticky-orange)");
    expect(stickyColorVar("paleYellow")).toBe("var(--sticky-pale-yellow)");
  });
});
