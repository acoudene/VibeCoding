import type { RoomRepository } from "@/application/ports/room-repository";
import type { Room } from "@/domain/room";

const GLOBAL_KEY = Symbol.for("blind-test.in-memory-room-repository");

type GlobalSlot = { rooms: Map<string, Room> };

function getStore(): Map<string, Room> {
  const g = globalThis as unknown as { [k: symbol]: GlobalSlot | undefined };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { rooms: new Map<string, Room>() };
  }
  return g[GLOBAL_KEY]!.rooms;
}

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms: Map<string, Room>;

  constructor(opts: { isolated?: boolean } = {}) {
    // isolated: true gives the caller a fresh map (useful in tests).
    this.rooms = opts.isolated ? new Map<string, Room>() : getStore();
  }

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

  clear(): void {
    this.rooms.clear();
  }
}
