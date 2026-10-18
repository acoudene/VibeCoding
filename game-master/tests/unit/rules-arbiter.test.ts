import { describe, expect, it } from "vitest";
import { parseCheckRequest } from "../../src/application/game-master/agents/rules-arbiter";

describe("parseCheckRequest (anti-corruption)", () => {
  it("accepts no-check", () => {
    expect(parseCheckRequest('{"required": false}')).toEqual({ required: false });
  });

  it("accepts a valid check", () => {
    expect(parseCheckRequest('{"required": true, "difficultyClass": 15, "ability": "DEX"}')).toEqual({
      required: true,
      difficultyClass: 15,
      ability: "DEX",
    });
  });

  it.each(["not json", '{"required": true}', '{"required": true, "difficultyClass": 15}', '{"required": true, "difficultyClass": 15, "ability": "LUCK"}', '{"required": true, "difficultyClass": 99, "ability": "STR"}', '{"required": true, "difficultyClass": 15, "ability": "dex"}', "null", '"x"'])(
    "rejects %s",
    (raw) => {
      expect(() => parseCheckRequest(raw)).toThrow("invalid response");
    },
  );
});
