import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type Container, setContainerForTests } from "@/app/api/_di";
import { Buzz } from "@/application/use-cases/buzz";
import { CreateRoom } from "@/application/use-cases/create-room";
import { JoinRoom } from "@/application/use-cases/join-room";
import { LeaveRoom } from "@/application/use-cases/leave-room";
import { OverrideAnswerOutcome } from "@/application/use-cases/override-answer-outcome";
import { PlayTrack } from "@/application/use-cases/play-track";
import { PostChatMessage } from "@/application/use-cases/post-chat-message";
import { ResolveInputRound } from "@/application/use-cases/resolve-input-round";
import { SetRoomMode } from "@/application/use-cases/set-room-mode";
import { StartGame } from "@/application/use-cases/start-game";
import { SubmitAnswer } from "@/application/use-cases/submit-answer";
import { ToggleChat } from "@/application/use-cases/toggle-chat";
import { ValidateAnswer } from "@/application/use-cases/validate-answer";

import {
  FakeChatRepository,
  FakeClock,
  FakeCodeGenerator,
  FakeRealtimeChannel,
  FakeRoomRepository,
} from "../test-doubles";

const VALID_YT = "dQw4w9WgXcQ";
const PLAYLIST = {
  id: "pl1",
  name: "p",
  tracks: [
    { expectedTitle: "t1", expectedArtist: "a", youtubeId: VALID_YT },
    { expectedTitle: "t2", expectedArtist: "a", youtubeId: VALID_YT },
  ],
};

let restore: () => void;
let repo: FakeRoomRepository;
let chats: FakeChatRepository;
let channel: FakeRealtimeChannel;
let clock: FakeClock;

beforeEach(() => {
  repo = new FakeRoomRepository();
  chats = new FakeChatRepository();
  channel = new FakeRealtimeChannel();
  clock = new FakeClock(1_000_000);
  const codeGenerator = new FakeCodeGenerator(["ABCDEF"]);
  const container: Container = {
    channel: channel as unknown as Container["channel"],
    rooms: repo,
    chats: chats as unknown as Container["chats"],
    createRoom: new CreateRoom({ repo, channel, clock, codeGenerator }),
    joinRoom: new JoinRoom({ repo, chatRepo: chats, channel }),
    startGame: new StartGame({ repo, channel, clock }),
    playTrack: new PlayTrack({ repo, channel, clock }),
    buzz: new Buzz({ repo, channel, clock }),
    validateAnswer: new ValidateAnswer({ repo, channel, clock }),
    leaveRoom: new LeaveRoom({ repo, channel }),
    setRoomMode: new SetRoomMode({ repo, channel }),
    submitAnswer: new SubmitAnswer({ repo, channel, clock }),
    resolveInputRound: new ResolveInputRound({ repo, channel, clock }),
    overrideAnswerOutcome: new OverrideAnswerOutcome({ repo, channel }),
    postChatMessage: new PostChatMessage({ rooms: repo, chats, channel, clock }),
    toggleChat: new ToggleChat({ rooms: repo, chats, channel }),
  };
  restore = setContainerForTests(container);
});

afterEach(() => {
  restore();
});

const jsonReq = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (code: string) => ({ params: Promise.resolve({ code }) });

describe("POST /api/rooms (CreateRoom)", () => {
  it("returns 201 with the generated code", async () => {
    const { POST } = await import("@/app/api/rooms/route");
    const res = await POST(
      jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("ABCDEF");
  });

  it("returns 400 on missing fields", async () => {
    const { POST } = await import("@/app/api/rooms/route");
    const res = await POST(jsonReq("http://test/api/rooms", {}));
    expect(res.status).toBe(400);
  });

  it("returns 400 on an invalid playlist", async () => {
    const { POST } = await import("@/app/api/rooms/route");
    const res = await POST(
      jsonReq("http://test/api/rooms", {
        hostId: "host-1",
        playlist: { id: "x", name: "x", tracks: [] },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/rooms/[code]/join", () => {
  it("joins a player and returns ok", async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST } = await import("@/app/api/rooms/[code]/join/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
    expect((await repo.find("ABCDEF"))?.players[0]?.id).toBe("p1");
  });

  it("returns 404 for unknown room", async () => {
    const { POST } = await import("@/app/api/rooms/[code]/join/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ZZZZZZ/join", { playerId: "p1", nickname: "Alice" }),
      params("ZZZZZZ"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 on duplicate nickname", async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST } = await import("@/app/api/rooms/[code]/join/route");
    await POST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p2", nickname: "ALICE" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /api/rooms/[code]/start", () => {
  const seed = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
  };

  it("starts the game", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/start/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "host-1" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
    expect((await repo.find("ABCDEF"))?.status).toBe("playing");
  });

  it("returns 403 for non-host", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/start/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "intruder" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/rooms/[code]/play-track", () => {
  const seedAndStart = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const { POST: startPOST } = await import("@/app/api/rooms/[code]/start/route");
    await startPOST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "host-1" }),
      params("ABCDEF"),
    );
    channel.published.length = 0;
  };

  it("publishes track:started", async () => {
    await seedAndStart();
    const { POST } = await import("@/app/api/rooms/[code]/play-track/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/play-track", { hostId: "host-1", trackIndex: 0 }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
    expect(channel.eventsOn("presence-room-ABCDEF").map((e) => e.event)).toContain("track:started");
  });

  it("returns 409 on track index mismatch", async () => {
    await seedAndStart();
    const { POST } = await import("@/app/api/rooms/[code]/play-track/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/play-track", { hostId: "host-1", trackIndex: 5 }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /api/rooms/[code]/buzz", () => {
  const seedAndStart = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const { POST: startPOST } = await import("@/app/api/rooms/[code]/start/route");
    await startPOST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "host-1" }),
      params("ABCDEF"),
    );
    // Clear the buzz grace period so subsequent buzz requests are accepted.
    clock.advance(600);
  };

  it("buzzes successfully", async () => {
    await seedAndStart();
    const { POST } = await import("@/app/api/rooms/[code]/buzz/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/buzz", { playerId: "p1" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 409 on second buzz", async () => {
    await seedAndStart();
    const { POST } = await import("@/app/api/rooms/[code]/buzz/route");
    await POST(jsonReq("http://test/api/rooms/ABCDEF/buzz", { playerId: "p1" }), params("ABCDEF"));
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/buzz", { playerId: "p1" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(409);
  });

  it("returns 409 BuzzTooEarlyError when buzz arrives within the grace period", async () => {
    // Custom seed that skips the clock advance done by seedAndStart().
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const { POST: startPOST } = await import("@/app/api/rooms/[code]/start/route");
    await startPOST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "host-1" }),
      params("ABCDEF"),
    );
    // No clock advance here -> buzz is within the grace period.
    const { POST: buzzPOST } = await import("@/app/api/rooms/[code]/buzz/route");
    const res = await buzzPOST(
      jsonReq("http://test/api/rooms/ABCDEF/buzz", { playerId: "p1" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("BuzzTooEarlyError");
  });
});

describe("POST /api/rooms/[code]/validate", () => {
  const seedAndBuzz = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const { POST: startPOST } = await import("@/app/api/rooms/[code]/start/route");
    await startPOST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "host-1" }),
      params("ABCDEF"),
    );
    clock.advance(600); // clear buzz grace period
    const { POST: buzzPOST } = await import("@/app/api/rooms/[code]/buzz/route");
    await buzzPOST(
      jsonReq("http://test/api/rooms/ABCDEF/buzz", { playerId: "p1" }),
      params("ABCDEF"),
    );
  };

  it("validates correct", async () => {
    await seedAndBuzz();
    const { POST } = await import("@/app/api/rooms/[code]/validate/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/validate", {
        hostId: "host-1",
        outcome: "correct",
      }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
    const room = await repo.find("ABCDEF");
    expect(room?.players[0]?.score).toBe(1);
  });

  it("returns 400 on invalid outcome", async () => {
    await seedAndBuzz();
    const { POST } = await import("@/app/api/rooms/[code]/validate/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/validate", {
        hostId: "host-1",
        outcome: "garbage",
      }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/rooms/[code]/set-mode", () => {
  const seed = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
  };

  it("changes mode to input in lobby", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/set-mode/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/set-mode", { hostId: "host-1", mode: "input" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
    expect((await repo.find("ABCDEF"))?.mode).toBe("input");
  });

  it("400 on invalid mode", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/set-mode/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/set-mode", { hostId: "host-1", mode: "qcm" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(400);
  });

  it("403 when caller is not host", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/set-mode/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/set-mode", { hostId: "p1", mode: "input" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/rooms/[code]/submit-answer", () => {
  const seedInput = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const { POST: setModePOST } = await import("@/app/api/rooms/[code]/set-mode/route");
    await setModePOST(
      jsonReq("http://test/api/rooms/ABCDEF/set-mode", { hostId: "host-1", mode: "input" }),
      params("ABCDEF"),
    );
    const { POST: startPOST } = await import("@/app/api/rooms/[code]/start/route");
    await startPOST(
      jsonReq("http://test/api/rooms/ABCDEF/start", { hostId: "host-1" }),
      params("ABCDEF"),
    );
  };

  it("accepts a submission", async () => {
    await seedInput();
    const { POST } = await import("@/app/api/rooms/[code]/submit-answer/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/submit-answer", {
        playerId: "p1",
        title: "t1",
      }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
  });

  it("409 on second submission (R10)", async () => {
    await seedInput();
    const { POST } = await import("@/app/api/rooms/[code]/submit-answer/route");
    await POST(
      jsonReq("http://test/api/rooms/ABCDEF/submit-answer", {
        playerId: "p1",
        title: "first",
      }),
      params("ABCDEF"),
    );
    const second = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/submit-answer", {
        playerId: "p1",
        title: "second",
      }),
      params("ABCDEF"),
    );
    expect(second.status).toBe(409);
  });

  it("400 when both fields are missing", async () => {
    await seedInput();
    const { POST } = await import("@/app/api/rooms/[code]/submit-answer/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/submit-answer", {
        playerId: "p1",
        title: "",
        artist: "",
      }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(400);
  });

  it("400 when a field exceeds 100 characters", async () => {
    await seedInput();
    const { POST } = await import("@/app/api/rooms/[code]/submit-answer/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/submit-answer", {
        playerId: "p1",
        title: "a".repeat(101),
      }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/rooms/[code]/chat", () => {
  const seed = async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
  };

  it("posts a message", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/chat/route");
    const res = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "hello" }),
      params("ABCDEF"),
    );
    expect(res.status).toBe(200);
  });

  it("400 on empty / 400 on too long", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/chat/route");
    const empty = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "  " }),
      params("ABCDEF"),
    );
    expect(empty.status).toBe(400);
    const longRes = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "a".repeat(201) }),
      params("ABCDEF"),
    );
    expect(longRes.status).toBe(400);
  });

  it("429 on cooldown", async () => {
    await seed();
    const { POST } = await import("@/app/api/rooms/[code]/chat/route");
    await POST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "first" }),
      params("ABCDEF"),
    );
    clock.advance(100);
    const second = await POST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "second" }),
      params("ABCDEF"),
    );
    expect(second.status).toBe(429);
  });

  it("GET returns messages history", async () => {
    await seed();
    const { POST, GET } = await import("@/app/api/rooms/[code]/chat/route");
    await POST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "hi" }),
      params("ABCDEF"),
    );
    const res = await GET(new Request("http://test/api/rooms/ABCDEF/chat"), params("ABCDEF"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.isOpen).toBe(true);
  });
});

describe("POST /api/rooms/[code]/chat-toggle", () => {
  it("toggles + 403 when player is locked out", async () => {
    const { POST: createPOST } = await import("@/app/api/rooms/route");
    await createPOST(jsonReq("http://test/api/rooms", { hostId: "host-1", playlist: PLAYLIST }));
    const { POST: joinPOST } = await import("@/app/api/rooms/[code]/join/route");
    await joinPOST(
      jsonReq("http://test/api/rooms/ABCDEF/join", { playerId: "p1", nickname: "Alice" }),
      params("ABCDEF"),
    );
    const { POST: togglePOST } = await import("@/app/api/rooms/[code]/chat-toggle/route");
    const t1 = await togglePOST(
      jsonReq("http://test/api/rooms/ABCDEF/chat-toggle", { hostId: "host-1" }),
      params("ABCDEF"),
    );
    expect(t1.status).toBe(200);
    const { POST: chatPOST } = await import("@/app/api/rooms/[code]/chat/route");
    const blocked = await chatPOST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "p1", text: "hi" }),
      params("ABCDEF"),
    );
    expect(blocked.status).toBe(403);
    const hostPost = await chatPOST(
      jsonReq("http://test/api/rooms/ABCDEF/chat", { authorId: "host-1", text: "annonce" }),
      params("ABCDEF"),
    );
    expect(hostPost.status).toBe(200);
  });
});
