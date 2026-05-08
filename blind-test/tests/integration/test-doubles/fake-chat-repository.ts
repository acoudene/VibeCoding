import type { ChatRepository } from "@/application/ports/chat-repository";
import type { Chat } from "@/domain/chat";

export class FakeChatRepository implements ChatRepository {
  private readonly chats = new Map<string, Chat>();

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
}
