import { describe, expect, it } from "vitest";

import { buildIceServers } from "./ice-config";

describe("buildIceServers", () => {
  it("returns the two default STUN servers when no TURN env is provided", () => {
    const servers = buildIceServers({});
    expect(servers).toHaveLength(1);
    const stun = servers[0]!;
    expect(stun.urls).toEqual(["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"]);
    expect(stun.username).toBeUndefined();
    expect(stun.credential).toBeUndefined();
  });

  it("appends a TURN server when the URL, username, and credential are all set", () => {
    const servers = buildIceServers({
      TURN_URL: "turn:turn.example.com:3478",
      TURN_USERNAME: "u",
      TURN_CREDENTIAL: "c",
    });
    expect(servers).toHaveLength(2);
    expect(servers[1]).toEqual({
      urls: "turn:turn.example.com:3478",
      username: "u",
      credential: "c",
    });
  });

  it("ignores the TURN config when the URL is set but credentials are missing", () => {
    expect(buildIceServers({ TURN_URL: "turn:x:3478" })).toHaveLength(1);
    expect(buildIceServers({ TURN_URL: "turn:x:3478", TURN_USERNAME: "u" })).toHaveLength(1);
    expect(buildIceServers({ TURN_URL: "turn:x:3478", TURN_CREDENTIAL: "c" })).toHaveLength(1);
  });

  it("trims whitespace and ignores empty strings", () => {
    expect(
      buildIceServers({ TURN_URL: "  ", TURN_USERNAME: "u", TURN_CREDENTIAL: "c" }),
    ).toHaveLength(1);
    expect(
      buildIceServers({ TURN_URL: "turn:x:3478", TURN_USERNAME: "  ", TURN_CREDENTIAL: "c" }),
    ).toHaveLength(1);
  });
});
