import type { Track } from "./track";

export class EmptyPlaylistNameError extends Error {
  constructor() {
    super("Playlist name must not be empty");
    this.name = "EmptyPlaylistNameError";
  }
}

export class EmptyPlaylistError extends Error {
  constructor() {
    super("Playlist must contain at least one track");
    this.name = "EmptyPlaylistError";
  }
}

export type PlaylistId = string;

export type PlaylistProps = {
  id: PlaylistId;
  name: string;
  tracks: Track[];
};

export class Playlist {
  readonly id: PlaylistId;
  readonly name: string;
  readonly tracks: ReadonlyArray<Track>;

  private constructor(id: PlaylistId, name: string, tracks: ReadonlyArray<Track>) {
    this.id = id;
    this.name = name;
    this.tracks = tracks;
  }

  static create(props: PlaylistProps): Playlist {
    if (props.name.trim().length === 0) throw new EmptyPlaylistNameError();
    if (props.tracks.length === 0) throw new EmptyPlaylistError();
    return new Playlist(props.id, props.name, [...props.tracks]);
  }

  get length(): number {
    return this.tracks.length;
  }

  trackAt(index: number): Track | undefined {
    if (index < 0 || index >= this.tracks.length) return undefined;
    return this.tracks[index];
  }
}
