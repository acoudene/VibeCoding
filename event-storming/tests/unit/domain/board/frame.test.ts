import { describe, expect, it } from "vitest";
import { frameOf, nextFrameName, type Frame } from "../../../../src/domain/board/frame";
import { position, rect } from "../../../../src/domain/board/geometry";

const frame = (id: string, x: number, y: number, w: number, h: number): Frame => ({ id, name: id, rect: rect(x, y, w, h) });

describe("frameOf", () => {
  it("renvoie le cadre qui contient le centre", () => {
    const a = frame("a", 0, 0, 100, 100);
    const b = frame("b", 200, 0, 100, 100);
    expect(frameOf(position(250, 50), [a, b])).toBe(b);
  });
  it("renvoie undefined sans cadre ou hors de tout cadre", () => {
    expect(frameOf(position(5, 5), [])).toBeUndefined();
    expect(frameOf(position(500, 500), [frame("a", 0, 0, 100, 100)])).toBeUndefined();
  });
  it("inclut les bords", () => expect(frameOf(position(100, 100), [frame("a", 0, 0, 100, 100)])?.id).toBe("a"));
  it("cadres imbriqués : le plus petit gagne, quel que soit l'ordre", () => {
    const big = frame("big", 0, 0, 400, 400);
    const small = frame("small", 100, 100, 100, 100);
    expect(frameOf(position(150, 150), [big, small])?.id).toBe("small");
    expect(frameOf(position(150, 150), [small, big])?.id).toBe("small");
  });
  it("égalité d'aire : le plus petit identifiant", () => {
    const b = frame("b", 0, 0, 100, 100);
    const a = frame("a", 50, 0, 100, 100);
    expect(frameOf(position(75, 50), [b, a])?.id).toBe("a");
    expect(frameOf(position(75, 50), [a, b])?.id).toBe("a");
  });
});

describe("nextFrameName", () => {
  it("numérote à partir de 1", () => expect(nextFrameName([])).toBe("Contexte 1"));
  it("N = nombre de cadres + 1", () =>
    expect(nextFrameName([frame("a", 0, 0, 1, 1), frame("b", 0, 0, 1, 1)])).toBe("Contexte 3"));
});
