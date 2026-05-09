import type { ChatRepository } from "@/application/ports/chat-repository";
import type { Chat } from "@/domain/chat";

const GLOBAL_KEY = Symbol.for("blind-test.in-memory-chat-repository");

type GlobalSlot = { chats: Map<string, Chat> };

function getStore(): Map<string, Chat> {
  const g = globalThis as unknown as { [k: symbol]: GlobalSlot | undefined };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { chats: new Map<string, Chat>() };
  }
  return g[GLOBAL_KEY]!.chats;
}

export class InMemoryChatRepository implements ChatRepository {
  private readonly chats: Map<string, Chat>;

  constructor(opts: { isolated?: boolean } = {}) {
    this.chats = opts.isolated ? new Map<string, Chat>() : getStore();
  }

  async find(roomCode: string): Promise<Chat | null> {
    return this.chats.get(roomCode) ?? null;
  }

  async save(chat: Chat): Promise<void> {
    this.chats.set(chat.roomCode, chat);
  }

  async delete(roomCode: string): Promise<void> {
    this.chats.delete(roomCode);
  }

  size(): number {
    return this.chats.size;
  }

  clear(): void {
    this.chats.clear();
  }
}
