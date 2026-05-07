import type { Room } from "@/domain/room";

export type RoomRepository = {
  find(code: string): Promise<Room | null>;
  save(room: Room): Promise<void>;
  delete(code: string): Promise<void>;
};
