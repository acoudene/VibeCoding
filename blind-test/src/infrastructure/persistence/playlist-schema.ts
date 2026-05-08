import { z } from "zod";

export const TrackSchema = z.object({
  expectedTitle: z.string().min(1),
  expectedArtist: z.string().min(1),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  startSeconds: z.number().int().nonnegative().optional(),
});

export const PlaylistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tracks: z.array(TrackSchema).min(1),
});

export type PlaylistDto = z.infer<typeof PlaylistSchema>;
export type TrackDto = z.infer<typeof TrackSchema>;
