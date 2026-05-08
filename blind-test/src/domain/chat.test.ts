import { describe, expect, it } from "vitest";

import {
  Chat,
  CHAT_COOLDOWN_MS,
  CHAT_MAX_LENGTH,
  ChatClosedError,
  ChatCooldownError,
  ChatEmptyError,
  ChatTooLongError,
} from "./chat";

const HOST = { id: "host-1", role: "host" as const };
const ALICE = { id: "alice", role: "player" as const };
const BOB = { id: "bob", role: "player" as const };

describe("Chat.create", () => {
  it("starts open with no messages", () => {
    const chat = Chat.create("ABCDEF");
    expect(chat.roomCode).toBe("ABCDEF");
    expect(chat.isOpen).toBe(true);
    expect(chat.messages).toEqual([]);
  });
});

describe("Chat.post — content rules (R13)", () => {
  it("appends a player message with author, role, text, at", () => {
    const next = Chat.create("R").post({ author: ALICE, text: "hello", at: 1000 });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]).toMatchObject({
      authorId: "alice",
      role: "player",
      text: "hello",
      at: 1000,
    });
    expect(next.messages[0]?.id).toMatch(/.+/);
  });

  it("trims whitespace and rejects empty messages", () => {
    const chat = Chat.create("R");
    expect(() => chat.post({ author: ALICE, text: "", at: 1000 })).toThrow(ChatEmptyError);
    expect(() => chat.post({ author: ALICE, text: "   ", at: 1000 })).toThrow(ChatEmptyError);
    expect(() => chat.post({ author: ALICE, text: "\n\t", at: 1000 })).toThrow(ChatEmptyError);
  });

  it(`accepts up to ${CHAT_MAX_LENGTH} characters and rejects above`, () => {
    const chat = Chat.create("R");
    const okText = "a".repeat(CHAT_MAX_LENGTH);
    const tooLongText = "a".repeat(CHAT_MAX_LENGTH + 1);
    expect(() => chat.post({ author: ALICE, text: okText, at: 1000 })).not.toThrow();
    expect(() => chat.post({ author: ALICE, text: tooLongText, at: 1000 })).toThrow(
      ChatTooLongError,
    );
  });
});

describe("Chat.post — cooldown (R13)", () => {
  it(`enforces a ${CHAT_COOLDOWN_MS}ms cooldown for players`, () => {
    let chat = Chat.create("R").post({ author: ALICE, text: "first", at: 1000 });
    expect(() => chat.post({ author: ALICE, text: "spam", at: 1000 + 100 })).toThrow(
      ChatCooldownError,
    );
    expect(() => chat.post({ author: ALICE, text: "spam", at: 1000 + CHAT_COOLDOWN_MS - 1 })).toThrow(
      ChatCooldownError,
    );
    chat = chat.post({ author: ALICE, text: "ok", at: 1000 + CHAT_COOLDOWN_MS });
    expect(chat.messages).toHaveLength(2);
  });

  it("does not enforce the cooldown across different players", () => {
    let chat = Chat.create("R").post({ author: ALICE, text: "hi", at: 1000 });
    chat = chat.post({ author: BOB, text: "hi", at: 1100 });
    expect(chat.messages).toHaveLength(2);
  });

  it("does not enforce the cooldown for the host", () => {
    let chat = Chat.create("R").post({ author: HOST, text: "annonce", at: 1000 });
    chat = chat.post({ author: HOST, text: "encore", at: 1100 });
    expect(chat.messages).toHaveLength(2);
  });
});

describe("Chat.toggle and closed mode", () => {
  it("toggles isOpen", () => {
    const chat = Chat.create("R").toggle();
    expect(chat.isOpen).toBe(false);
    expect(chat.toggle().isOpen).toBe(true);
  });

  it("when closed, rejects player posts (R13)", () => {
    const closed = Chat.create("R").toggle();
    expect(() => closed.post({ author: ALICE, text: "hi", at: 1000 })).toThrow(ChatClosedError);
  });

  it("when closed, still allows the host to post", () => {
    const closed = Chat.create("R").toggle();
    const next = closed.post({ author: HOST, text: "annonce", at: 1000 });
    expect(next.messages).toHaveLength(1);
    expect(next.isOpen).toBe(false);
  });
});
