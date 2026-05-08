import type { RoomRepository } from "@/application/ports/room-repository";
import type { Room } from "@/domain/room";

export class FakeRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>();

  async find(code: string): Promise<Room | null> {
    return this.rooms.get(code) ?? null;
  }

  async save(room: Room): Promise<void> {
    this.rooms.set(room.code, room);
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code);
  }

  size(): number {
    return this.rooms.size;
  }
}
