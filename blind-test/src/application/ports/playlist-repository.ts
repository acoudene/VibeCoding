import type { Playlist } from "@/domain/playlist";

export type PlaylistRepository = {
  list(): Promise<Playlist[]>;
  find(id: string): Promise<Playlist | null>;
  save(playlist: Playlist): Promise<void>;
  delete(id: string): Promise<void>;
};
