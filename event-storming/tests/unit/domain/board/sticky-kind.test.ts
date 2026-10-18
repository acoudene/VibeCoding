import { describe, expect, it } from "vitest";
import { STICKY_KINDS, stickyColor } from "../../../../src/domain/board/sticky-kind";

describe("stickyColor", () => {
  it.each([
    ["DomainEvent", "orange"], ["Command", "blue"], ["Actor", "paleYellow"],
    ["Aggregate", "yellow"], ["Policy", "purple"], ["ReadModel", "green"],
    ["ExternalSystem", "pink"], ["Hotspot", "red"], ["Rule", "grey"],
  ] as const)("%s → %s", (kind, color) => expect(stickyColor(kind)).toBe(color));

  it("attribue une couleur distincte à chaque type", () => {
    expect(new Set(STICKY_KINDS.map(stickyColor)).size).toBe(STICKY_KINDS.length);
  });
});
