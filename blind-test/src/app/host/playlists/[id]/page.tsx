"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Playlist } from "@/domain/playlist";
import { Track } from "@/domain/track";
import { LocalStoragePlaylistRepository } from "@/infrastructure/persistence/local-storage-playlist-repository";

import { extractYoutubeId } from "../../_lib/youtube-id";

const repo = new LocalStoragePlaylistRepository();

type EditableTrack = {
  expectedTitle: string;
  expectedArtist: string;
  youtubeRaw: string;
  youtubeId: string | null;
  startSeconds: string;
};

const trackToEditable = (t: Track): EditableTrack => ({
  expectedTitle: t.expectedTitle,
  expectedArtist: t.expectedArtist,
  youtubeRaw: `https://youtu.be/${t.youtubeId}`,
  youtubeId: t.youtubeId,
  startSeconds: t.startSeconds === undefined ? "" : String(t.startSeconds),
});

const emptyTrack = (): EditableTrack => ({
  expectedTitle: "",
  expectedArtist: "",
  youtubeRaw: "",
  youtubeId: null,
  startSeconds: "",
});

export default function PlaylistEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const playlistId = params.id;

  const [name, setName] = useState("");
  const [tracks, setTracks] = useState<EditableTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    repo.find(playlistId).then((p) => {
      if (!p) {
        router.push("/host/playlists");
        return;
      }
      setName(p.name);
      setTracks(p.tracks.map(trackToEditable));
      setLoading(false);
    });
  }, [playlistId, router]);

  const updateTrack = (idx: number, patch: Partial<EditableTrack>) => {
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const addTrack = () => {
    setTracks((prev) => [...prev, emptyTrack()]);
  };

  const removeTrack = (idx: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= tracks.length) return;
    setTracks((prev) => {
      const copy = [...prev];
      const [a] = copy.splice(idx, 1);
      copy.splice(next, 0, a!);
      return copy;
    });
  };

  const save = useCallback(async () => {
    setError(null);
    try {
      const built = Playlist.create({
        id: playlistId,
        name,
        tracks: tracks.map((t) => {
          const id = t.youtubeId ?? extractYoutubeId(t.youtubeRaw);
          if (!id) throw new Error(`Lien YouTube invalide pour "${t.expectedTitle}".`);
          const startSeconds = t.startSeconds.trim() === "" ? undefined : Number(t.startSeconds);
          return Track.create({
            expectedTitle: t.expectedTitle,
            expectedArtist: t.expectedArtist,
            youtubeId: id,
            startSeconds,
          });
        }),
      });
      await repo.save(built);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    }
  }, [name, tracks, playlistId]);

  const startGame = async () => {
    await save();
    if (error) return;
    // Use the saved playlist for room creation.
    const playlist = await repo.find(playlistId);
    if (!playlist) return;
    const hostId = ensureHostId();
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hostId,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          tracks: playlist.tracks.map((t) => ({
            expectedTitle: t.expectedTitle,
            expectedArtist: t.expectedArtist,
            youtubeId: t.youtubeId,
            ...(t.startSeconds !== undefined ? { startSeconds: t.startSeconds } : {}),
          })),
        },
      }),
    });
    if (!res.ok) {
      setError(`Échec à la création de la salle (${res.status})`);
      return;
    }
    const { code } = (await res.json()) as { code: string };
    router.push(`/host/rooms/${code}`);
  };

  if (loading) return <main className="p-8 text-zinc-500">Chargement…</main>;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/host/playlists" className="text-sm text-blue-600 hover:underline">
          ← Mes playlists
        </Link>
        {savedAt ? <span className="text-sm text-zinc-500">Enregistré</span> : null}
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la playlist"
        className="mb-6 w-full border-b border-zinc-300 bg-transparent py-2 text-2xl font-semibold focus:border-blue-500 focus:outline-none dark:border-zinc-700"
      />

      <ul className="space-y-3">
        {tracks.map((t, idx) => (
          <li
            key={idx}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Titre attendu"
                value={t.expectedTitle}
                onChange={(e) => updateTrack(idx, { expectedTitle: e.target.value })}
                className="flex-1 min-w-[200px] rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <input
                type="text"
                placeholder="Artiste"
                value={t.expectedArtist}
                onChange={(e) => updateTrack(idx, { expectedArtist: e.target.value })}
                className="flex-1 min-w-[160px] rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="https://youtu.be/…  ou  ID 11 caractères"
                value={t.youtubeRaw}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateTrack(idx, { youtubeRaw: raw, youtubeId: extractYoutubeId(raw) });
                }}
                className={`flex-1 min-w-[280px] rounded border px-3 py-2 dark:bg-zinc-800 ${
                  t.youtubeRaw && !t.youtubeId
                    ? "border-red-400"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              />
              <input
                type="number"
                min={0}
                placeholder="Début (s)"
                value={t.startSeconds}
                onChange={(e) => updateTrack(idx, { startSeconds: e.target.value })}
                className="w-28 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded px-2 py-1 text-sm disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === tracks.length - 1}
                  className="rounded px-2 py-1 text-sm disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeTrack(idx)}
                  className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  ×
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addTrack}
        className="mt-4 w-full rounded-xl border border-dashed border-zinc-300 py-3 text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        + Ajouter un morceau
      </button>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 flex justify-between gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-lg border border-zinc-300 px-5 py-2 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={startGame}
          disabled={tracks.length === 0}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Lancer une partie →
        </button>
      </div>
    </main>
  );
}

function ensureHostId(): string {
  const KEY = "bt:hostId:v1";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
