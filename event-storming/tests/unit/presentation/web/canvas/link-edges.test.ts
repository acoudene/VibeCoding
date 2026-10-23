import { describe, expect, it } from "vitest";
import { syncLinkEdges } from "../../../../../src/presentation/web/canvas/link-edges";
import { link, makeBoard, sticky } from "../board-fixture";

const stickies = [
  sticky("event", { kind: "DomainEvent" }),
  sticky("policy", { kind: "Policy" }),
  sticky("command", { kind: "Command" }),
  sticky("hotspot", { kind: "Hotspot" }),
];

describe("syncLinkEdges", () => {
  it("crée une arête flottante fléchée par lien, au-dessus des cadres et sous les post-its", () => {
    const [edge] = syncLinkEdges([], makeBoard({ stickies, links: [link("l1", "event", "policy")] }));
    expect(edge).toMatchObject({
      id: "l1",
      source: "event",
      target: "policy",
      type: "floating",
      zIndex: 1,
      selected: false,
      markerEnd: { type: "arrowclosed" },
      className: "link-edge",
      ariaLabel: "Lien Événement → Policy",
      data: { anomaly: null },
    });
  });

  it("signale un lien hors grammaire par un style distinct et la règle attendue (FR-022)", () => {
    const [edge] = syncLinkEdges([], makeBoard({ stickies, links: [link("l1", "event", "command")] }));
    expect(edge?.className).toBe("link-edge link-edge--out-of-grammar");
    expect(edge?.data?.anomaly).toBe("Lien hors grammaire — attendu : DomainEvent → Policy, DomainEvent → ReadModel");
    expect(edge?.ariaLabel).toBe("Lien Événement → Commande (hors grammaire)");
  });

  it("indique qu'aucun lien n'est attendu depuis un type sans règle", () => {
    const [edge] = syncLinkEdges([], makeBoard({ stickies, links: [link("l1", "hotspot", "event")] }));
    expect(edge?.data?.anomaly).toBe("Lien hors grammaire — aucun lien attendu depuis Hotspot");
  });

  it("suit le tableau (sens inversé, liens supprimés) en conservant la sélection", () => {
    const previous = syncLinkEdges(
      [],
      makeBoard({ stickies, links: [link("l1", "event", "policy"), link("l2", "policy", "command")] }),
    );
    const selected = previous.map((e) => ({ ...e, selected: e.id === "l1" }));
    const edges = syncLinkEdges(selected, makeBoard({ stickies, links: [link("l1", "policy", "event")] }));
    expect(edges.map((e) => [e.id, e.source, e.target, e.selected])).toEqual([["l1", "policy", "event", true]]);
  });

  it("réutilise l'arête précédente quand rien n'a changé (rendu mémoïsé)", () => {
    const board = makeBoard({ stickies, links: [link("l1", "event", "policy")] });
    const previous = syncLinkEdges([], board);
    expect(syncLinkEdges(previous, board)[0]).toBe(previous[0]);
  });

  it("requalifie le lien quand le type d'une extrémité change", () => {
    const previous = syncLinkEdges([], makeBoard({ stickies, links: [link("l1", "event", "policy")] }));
    const retyped = [sticky("event", { kind: "DomainEvent" }), sticky("policy", { kind: "Command" })];
    const [edge] = syncLinkEdges(previous, makeBoard({ stickies: retyped, links: [link("l1", "event", "policy")] }));
    expect(edge?.className).toBe("link-edge link-edge--out-of-grammar");
  });
});
