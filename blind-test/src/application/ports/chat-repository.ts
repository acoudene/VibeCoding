import type { Chat } from "@/domain/chat";

export type ChatRepository = {
  find(roomCode: string): Promise<Chat | null>;
  save(chat: Chat): Promise<void>;
  delete(roomCode: string): Promise<void>;
};
