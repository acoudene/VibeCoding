"use client";

import type { PlaylistRepository } from "@/application/ports/playlist-repository";
import { Playlist } from "@/domain/playlist";
import { Track } from "@/domain/track";

import { type PlaylistDto, PlaylistSchema } from "./playlist-schema";

const STORAGE_KEY = "bt:playlists:v1";

function readAll(): PlaylistDto[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return PlaylistSchema.array().parse(parsed);
  } catch {
    return [];
  }
}

function writeAll(items: PlaylistDto[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function dtoToPlaylist(dto: PlaylistDto): Playlist {
  return Playlist.create({
    id: dto.id,
    name: dto.name,
    tracks: dto.tracks.map((t) =>
      Track.create({
        expectedTitle: t.expectedTitle,
        expectedArtist: t.expectedArtist,
        youtubeId: t.youtubeId,
        startSeconds: t.startSeconds,
      }),
    ),
  });
}

function playlistToDto(p: Playlist): PlaylistDto {
  return {
    id: p.id,
    name: p.name,
    tracks: p.tracks.map((t) => ({
      expectedTitle: t.expectedTitle,
      expectedArtist: t.expectedArtist,
      youtubeId: t.youtubeId,
      ...(t.startSeconds !== undefined ? { startSeconds: t.startSeconds } : {}),
    })),
  };
}

export class LocalStoragePlaylistRepository implements PlaylistRepository {
  async list(): Promise<Playlist[]> {
    return readAll().map(dtoToPlaylist);
  }

  async find(id: string): Promise<Playlist | null> {
    const dto = readAll().find((p) => p.id === id);
    return dto ? dtoToPlaylist(dto) : null;
  }

  async save(playlist: Playlist): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === playlist.id);
    const dto = playlistToDto(playlist);
    if (idx >= 0) {
      all[idx] = dto;
    } else {
      all.push(dto);
    }
    writeAll(all);
  }

  async delete(id: string): Promise<void> {
    const all = readAll().filter((p) => p.id !== id);
    writeAll(all);
  }
}
