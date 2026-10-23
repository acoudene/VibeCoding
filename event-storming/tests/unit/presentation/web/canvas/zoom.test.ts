import { describe, expect, it } from "vitest";
import { FIT_VIEW_OPTIONS, openingView, zoomPercent } from "../../../../../src/presentation/web/canvas/zoom";

describe("zoomPercent", () => {
  it("affiche le zoom en pourcentage arrondi", () => {
    expect(zoomPercent(1)).toBe("100 %");
    expect(zoomPercent(1.2)).toBe("120 %");
    expect(zoomPercent(0.8333)).toBe("83 %");
  });
});

describe("openingView", () => {
  it("reprend la vue mémorisée", () => {
    expect(openingView({ x: 10, y: -5, zoom: 0.5 }, false)).toEqual({ defaultViewport: { x: 10, y: -5, zoom: 0.5 } });
  });

  it("sans vue mémorisée, ajuste un tableau non vide à l'écran, sans agrandir au-delà de 100 %", () => {
    expect(openingView(undefined, false)).toEqual({ fitView: true, fitViewOptions: FIT_VIEW_OPTIONS });
    expect(FIT_VIEW_OPTIONS.maxZoom).toBe(1);
  });

  it("sans vue mémorisée, ouvre un tableau vide à 100 % (sans ajuster sur le premier post-it posé)", () => {
    expect(openingView(undefined, true)).toEqual({ defaultViewport: { x: 0, y: 0, zoom: 1 } });
  });
});
