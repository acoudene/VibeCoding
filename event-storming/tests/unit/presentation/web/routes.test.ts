import { describe, expect, it } from "vitest";
import { boardPath, parseRoute } from "../../../../src/presentation/web/routes";

describe("parseRoute", () => {
  it("reconnaît l'accueil", () => {
    expect(parseRoute("/")).toEqual({ page: "home" });
  });
  it("reconnaît un tableau", () => {
    expect(parseRoute("/b/abc_DEF-123")).toEqual({ page: "board", id: "abc_DEF-123" });
    expect(parseRoute("/b/abc/")).toEqual({ page: "board", id: "abc" });
  });
  it("renvoie notFound pour le reste", () => {
    expect(parseRoute("/b/")).toEqual({ page: "notFound" });
    expect(parseRoute("/b/a/b")).toEqual({ page: "notFound" });
    expect(parseRoute("/autre")).toEqual({ page: "notFound" });
  });
  it("construit le chemin d'un tableau", () => {
    expect(boardPath("abc")).toBe("/b/abc");
  });
});
