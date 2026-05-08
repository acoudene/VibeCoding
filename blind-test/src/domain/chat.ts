import type { PlayerId } from "./player";

export const CHAT_MAX_LENGTH = 200;
export const CHAT_COOLDOWN_MS = 500;

export type ChatRole = "host" | "player";

export interface ChatAuthor {
  readonly id: PlayerId;
  readonly role: ChatRole;
}

export interface ChatMessage {
  readonly id: string;
  readonly authorId: PlayerId;
  readonly role: ChatRole;
  readonly text: string;
  readonly at: number;
}

export class ChatEmptyError extends Error {
  constructor() {
    super("Chat message must not be empty");
    this.name = "ChatEmptyError";
  }
}

export class ChatTooLongError extends Error {
  constructor(length: number) {
    super(`Chat message must be at most ${CHAT_MAX_LENGTH} characters (got ${length})`);
    this.name = "ChatTooLongError";
  }
}

export class ChatCooldownError extends Error {
  constructor(remainingMs: number) {
    super(`Chat cooldown: wait ${remainingMs}ms before posting again`);
    this.name = "ChatCooldownError";
  }
}

export class ChatClosedError extends Error {
  constructor() {
    super("Chat is closed by the host");
    this.name = "ChatClosedError";
  }
}

export class Chat {
  readonly roomCode: string;
  readonly isOpen: boolean;
  readonly messages: ReadonlyArray<ChatMessage>;
  private readonly lastSentAt: ReadonlyMap<PlayerId, number>;
  private readonly seq: number;

  private constructor(args: {
    roomCode: string;
    isOpen: boolean;
    messages: ReadonlyArray<ChatMessage>;
    lastSentAt: ReadonlyMap<PlayerId, number>;
    seq: number;
  }) {
    this.roomCode = args.roomCode;
    this.isOpen = args.isOpen;
    this.messages = args.messages;
    this.lastSentAt = args.lastSentAt;
    this.seq = args.seq;
  }

  static create(roomCode: string): Chat {
    return new Chat({
      roomCode,
      isOpen: true,
      messages: [],
      lastSentAt: new Map(),
      seq: 0,
    });
  }

  post(props: { author: ChatAuthor; text: string; at: number }): Chat {
    const trimmed = props.text.trim();
    if (trimmed.length === 0) throw new ChatEmptyError();
    if (trimmed.length > CHAT_MAX_LENGTH) throw new ChatTooLongError(trimmed.length);

    if (props.author.role === "player") {
      if (!this.isOpen) throw new ChatClosedError();
      const last = this.lastSentAt.get(props.author.id);
      if (last !== undefined) {
        const elapsed = props.at - last;
        if (elapsed < CHAT_COOLDOWN_MS) {
          throw new ChatCooldownError(CHAT_COOLDOWN_MS - elapsed);
        }
      }
    }

    const nextSeq = this.seq + 1;
    const message: ChatMessage = {
      id: `${props.at}-${nextSeq}`,
      authorId: props.author.id,
      role: props.author.role,
      text: trimmed,
      at: props.at,
    };
    const nextLast = new Map(this.lastSentAt);
    nextLast.set(props.author.id, props.at);
    return new Chat({
      roomCode: this.roomCode,
      isOpen: this.isOpen,
      messages: [...this.messages, message],
      lastSentAt: nextLast,
      seq: nextSeq,
    });
  }

  toggle(): Chat {
    return new Chat({
      roomCode: this.roomCode,
      isOpen: !this.isOpen,
      messages: this.messages,
      lastSentAt: this.lastSentAt,
      seq: this.seq,
    });
  }
}
