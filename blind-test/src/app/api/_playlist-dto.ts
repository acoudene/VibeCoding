import "server-only";

import { Playlist } from "@/domain/playlist";
import { Track } from "@/domain/track";

export type TrackDto = {
  expectedTitle: string;
  expectedArtist: string;
  youtubeId: string;
  startSeconds?: number;
};

export type PlaylistDto = {
  id: string;
  name: string;
  tracks: TrackDto[];
};

export function playlistFromDto(dto: PlaylistDto): Playlist {
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
