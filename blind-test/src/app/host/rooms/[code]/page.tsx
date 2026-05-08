"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  type PresenceMember,
  subscribeChannel,
  subscribePresence,
} from "@/infrastructure/realtime/pusher-client";

import { YoutubePlayer, type YoutubePlayerRef } from "../../_components/youtube-player";
import { ensureHostId } from "../../_lib/client-id";

type RoundOutcome = "correct" | "wrong" | "half" | "skip";
type RoomStatus = "lobby" | "playing" | "finished";

type ScoreEntry = { playerId: string; nickname: string; score: number };

type LocalState = {
  status: RoomStatus;
  trackIndex: number;
  currentBuzzer: { playerId: string; nickname: string } | null;
  scores: ScoreEntry[];
  leaderboard: ScoreEntry[];
};

type StoredPlaylist = {
  id: string;
  name: string;
  tracks: {
    expectedTitle: string;
    expectedArtist: string;
    youtubeId: string;
    startSeconds?: number;
  }[];
};

export default function HostRoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [hostId] = useState(() => ensureHostId());

  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [state, setState] = useState<LocalState>({
    status: "lobby",
    trackIndex: 0,
    currentBuzzer: null,
    scores: [],
    leaderboard: [],
  });
  const [playlist] = useState<StoredPlaylist | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = window.localStorage.getItem(`bt:room-playlist:${code}`);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as StoredPlaylist;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YoutubePlayerRef | null>(null);

  // Subscribe to presence (members count) and event channels.
  useEffect(() => {
    const presence = subscribePresence(
      { code, playerId: hostId, nickname: "Host" },
      {
        onSubscriptionSucceeded: (list) => setMembers(list.filter((m) => m.id !== hostId)),
        onMemberAdded: (m) =>
          setMembers((prev) => (m.id === hostId ? prev : [...prev, m])),
        onMemberRemoved: (m) => setMembers((prev) => prev.filter((x) => x.id !== m.id)),
      },
    );
    const channel = subscribeChannel(`room-${code}`);
    channel.bind("buzz:taken", (payload: { playerId: string; nickname: string }) => {
      setState((s) => ({ ...s, currentBuzzer: payload }));
      playerRef.current?.pause();
    });
    channel.bind("round:resolved", (payload: { outcome: RoundOutcome; scores: ScoreEntry[] }) => {
      setState((s) => ({ ...s, currentBuzzer: null, scores: payload.scores }));
    });
    channel.bind("track:ready", (payload: { trackIndex: number }) => {
      setState((s) => ({ ...s, trackIndex: payload.trackIndex, currentBuzzer: null }));
    });
    channel.bind("game:finished", (payload: { leaderboard: ScoreEntry[] }) => {
      setState((s) => ({ ...s, status: "finished", leaderboard: payload.leaderboard }));
    });
    channel.bind("game:started", () => {
      setState((s) => ({ ...s, status: "playing" }));
    });
    return () => {
      presence.unsubscribe();
      // Channel unsubscribe handled by client.unsubscribe in subscribePresence;
      // for non-presence we fire the same call:
      const client = (window as unknown as { Pusher?: unknown }).Pusher;
      void client; // no-op; the singleton manages teardown on next reload
    };
  }, [code, hostId]);

  const callApi = async (path: string, body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(`/api/rooms/${code}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? `Erreur ${res.status}`);
      return false;
    }
    return true;
  };

  const start = () => callApi("/start", { hostId });
  const validate = (outcome: RoundOutcome) => callApi("/validate", { hostId, outcome });
  const playTrack = () =>
    callApi("/play-track", { hostId, trackIndex: state.trackIndex }).then((ok) => {
      if (ok) playerRef.current?.play();
    });

  const currentTrack = playlist?.tracks[state.trackIndex];

  const copyShareLink = async () => {
    const url = `${window.location.origin}/play/${code}`;
    await navigator.clipboard?.writeText(url);
  };

  if (state.status === "lobby") {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="mb-2 text-sm text-zinc-500">Salle</div>
        <h1 className="font-mono text-6xl font-bold tracking-[0.4em]">{code}</h1>
        <button
          type="button"
          onClick={copyShareLink}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Copier le lien à partager
        </button>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Joueurs ({members.length})</h2>
          {members.length === 0 ? (
            <p className="mt-2 text-zinc-500">En attente des joueurs…</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {members.map((m) => (
                <li key={m.id} className="text-zinc-700 dark:text-zinc-200">
                  • {m.info.nickname}
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={start}
          disabled={members.length === 0}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Démarrer la partie
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </main>
    );
  }

  if (state.status === "finished") {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-12 text-center">
        <h1 className="text-3xl font-bold">Fin de la partie</h1>
        <ol className="mt-6 space-y-2 text-left">
          {state.leaderboard.map((e, i) => (
            <li
              key={e.playerId}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="font-mono text-zinc-500">#{i + 1}</span>
              <span className="flex-1 px-3 font-medium">{e.nickname}</span>
              <span className="font-bold">{e.score}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/host/playlists"
          className="mt-8 inline-block rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          Nouvelle partie
        </Link>
      </main>
    );
  }

  // playing
  return (
    <main className="mx-auto w-full max-w-5xl grid grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="mb-3 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Track {state.trackIndex + 1}
            {playlist ? ` / ${playlist.tracks.length}` : ""}
          </span>
          <span>
            {state.currentBuzzer ? `${state.currentBuzzer.nickname} a buzzé` : "En attente"}
          </span>
        </div>

        {currentTrack ? (
          <YoutubePlayer
            videoId={currentTrack.youtubeId}
            startSeconds={currentTrack.startSeconds}
            ref={playerRef}
          />
        ) : (
          <div className="aspect-video w-full rounded-xl border border-zinc-300 bg-zinc-100 p-6 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            Playlist introuvable côté client. Recharge depuis l&apos;éditeur.
          </div>
        )}

        {currentTrack ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm text-zinc-500">Réponse attendue</div>
            <div className="text-lg font-semibold">
              {currentTrack.expectedTitle}{" "}
              <span className="text-zinc-500">— {currentTrack.expectedArtist}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => playerRef.current?.play()}
            className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Lecture
          </button>
          <button
            type="button"
            onClick={() => playerRef.current?.pause()}
            className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={playTrack}
            className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Annoncer track
          </button>
        </div>

        {state.currentBuzzer ? (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => validate("correct")}
              className="rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
            >
              Correct
            </button>
            <button
              type="button"
              onClick={() => validate("half")}
              className="rounded-lg bg-yellow-500 py-3 font-medium text-white hover:bg-yellow-600"
            >
              Demi
            </button>
            <button
              type="button"
              onClick={() => validate("wrong")}
              className="rounded-lg bg-red-600 py-3 font-medium text-white hover:bg-red-700"
            >
              Faux
            </button>
            <button
              type="button"
              onClick={() => validate("skip")}
              className="rounded-lg border border-zinc-300 py-3 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Passer
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => validate("skip")}
              className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Passer ce morceau
            </button>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <aside className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Scores</h2>
        <ul className="space-y-1">
          {state.scores
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((s) => (
              <li key={s.playerId} className="flex justify-between">
                <span>{s.nickname}</span>
                <span className="font-bold">{s.score}</span>
              </li>
            ))}
        </ul>
      </aside>
    </main>
  );
}
