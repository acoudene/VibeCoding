"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Playlist } from "@/domain/playlist";
import { Track } from "@/domain/track";
import { LocalStoragePlaylistRepository } from "@/infrastructure/persistence/local-storage-playlist-repository";
import { PlaylistSchema } from "@/infrastructure/persistence/playlist-schema";

const repo = new LocalStoragePlaylistRepository();

const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = () => repo.list().then(setPlaylists);

  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    const placeholder = Track.create({
      expectedTitle: "Nouveau titre",
      expectedArtist: "Artiste",
      youtubeId: "dQw4w9WgXcQ",
    });
    const playlist = Playlist.create({
      id: newId(),
      name: "Nouvelle playlist",
      tracks: [placeholder],
    });
    await repo.save(playlist);
    refresh();
  };

  const duplicate = async (source: Playlist) => {
    const copy = Playlist.create({
      id: newId(),
      name: `${source.name} (copie)`,
      tracks: [...source.tracks],
    });
    await repo.save(copy);
    refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Supprimer cette playlist ?")) return;
    await repo.delete(id);
    refresh();
  };

  const exportOne = (p: Playlist) => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            id: p.id,
            name: p.name,
            tracks: p.tracks.map((t) => ({
              expectedTitle: t.expectedTitle,
              expectedArtist: t.expectedArtist,
              youtubeId: t.youtubeId,
              ...(t.startSeconds !== undefined ? { startSeconds: t.startSeconds } : {}),
            })),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = PlaylistSchema.parse(JSON.parse(text));
      const playlist = Playlist.create({
        id: newId(),
        name: parsed.name,
        tracks: parsed.tracks.map((t) =>
          Track.create({
            expectedTitle: t.expectedTitle,
            expectedArtist: t.expectedArtist,
            youtubeId: t.youtubeId,
            startSeconds: t.startSeconds,
          }),
        ),
      });
      await repo.save(playlist);
      refresh();
    } catch (err) {
      window.alert(`Import impossible : ${err instanceof Error ? err.message : "format invalide"}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mes playlists</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={create}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Nouvelle
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Importer JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {playlists.length === 0 ? (
        <p className="text-zinc-500">
          Aucune playlist pour l&apos;instant. Crée-en une pour commencer.
        </p>
      ) : (
        <ul className="space-y-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Link href={`/host/playlists/${p.id}`} className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-zinc-500">{p.length} morceaux</div>
              </Link>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => duplicate(p)}
                  className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => exportOne(p)}
                  className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Exporter
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
