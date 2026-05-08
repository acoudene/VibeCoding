"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Playlist } from "@/domain/playlist";
import { importPlaylist, InvalidPlaylistFileError } from "@/domain/playlist-import";
import { Track } from "@/domain/track";
import { LocalStoragePlaylistRepository } from "@/infrastructure/persistence/local-storage-playlist-repository";

const repo = new LocalStoragePlaylistRepository();

const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [importMessage, setImportMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
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
      const json: unknown = JSON.parse(text);
      const result = importPlaylist(json, { idFactory: newId });
      // The domain parser already returns a Playlist with a generated id;
      // we still re-emit through Playlist.create with a fresh id to avoid
      // collisions with existing entries when re-importing the same file.
      const playlist = Playlist.create({
        id: newId(),
        name: result.playlist.name,
        tracks: result.playlist.tracks.map((t) =>
          Track.create({
            expectedTitle: t.expectedTitle,
            expectedArtist: t.expectedArtist,
            youtubeId: t.youtubeId,
            startSeconds: t.startSeconds,
          }),
        ),
      });
      await repo.save(playlist);
      const total = result.imported + result.skipped;
      setImportMessage({
        kind: "success",
        text:
          result.format === "youtube"
            ? `Import YouTube : ${result.imported} / ${total} morceaux importés${
                result.skipped > 0
                  ? ` (${result.skipped} ignorés : vidéos privées ou supprimées)`
                  : ""
              }.`
            : `Playlist importée (${result.imported} morceaux).`,
      });
      refresh();
    } catch (err) {
      const text =
        err instanceof InvalidPlaylistFileError
          ? "Format de fichier non reconnu (attendu : export Blind Test ou playlist YouTube)."
          : err instanceof Error
            ? `Import impossible : ${err.message}`
            : "Import impossible.";
      setImportMessage({ kind: "error", text });
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

      {importMessage && (
        <div
          role={importMessage.kind === "error" ? "alert" : "status"}
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            importMessage.kind === "error"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <span>{importMessage.text}</span>
            <button
              type="button"
              onClick={() => setImportMessage(null)}
              className="text-xs underline"
            >
              fermer
            </button>
          </div>
        </div>
      )}

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
