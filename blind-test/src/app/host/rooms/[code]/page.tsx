"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { PresenceChannel } from "pusher-js";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type PresenceMember,
  subscribeChannel,
  subscribePresence,
} from "@/infrastructure/realtime/pusher-client";

import { ChatPanel } from "../../../_components/chat-panel";
import { useChat } from "../../../_lib/use-chat";
import { YoutubePlayer, type YoutubePlayerRef } from "../../_components/youtube-player";
import { ensureHostId } from "../../_lib/client-id";
import { useAudioBroadcaster } from "./_lib/use-audio-broadcaster";

type RoundOutcome = "correct" | "wrong" | "half" | "skip";
type InputOutcome = "correct" | "half" | "wrong";
type RoomMode = "buzz" | "input";
type RoomStatus = "lobby" | "playing" | "finished";

type ScoreEntry = { playerId: string; nickname: string; score: number };
type SubmissionEntry = {
  playerId: string;
  nickname: string;
  title?: string;
  artist?: string;
  outcome?: InputOutcome;
  hasTitle?: boolean;
  hasArtist?: boolean;
};

type LocalState = {
  status: RoomStatus;
  mode: RoomMode;
  trackIndex: number;
  currentBuzzer: { playerId: string; nickname: string } | null;
  scores: ScoreEntry[];
  leaderboard: ScoreEntry[];
  submissions: Record<string, SubmissionEntry>;
  resolved: boolean;
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

function AudioStateDot({ state }: { state?: string }) {
  const color =
    state === "connected"
      ? "bg-emerald-500"
      : state === "connecting" || state === "new"
        ? "bg-amber-500"
        : state === "failed"
          ? "bg-red-500"
          : "bg-zinc-300 dark:bg-zinc-700";
  return (
    <span
      title={state ?? "no audio"}
      className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
    />
  );
}

function AudioControls({ audio }: { audio: ReturnType<typeof useAudioBroadcaster> }) {
  return (
    <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Diffusion audio</div>
          <div className="text-xs text-zinc-500">
            {audio.state === "ready"
              ? "Capture active — les joueurs reçoivent l'audio."
              : "Cliquez pour autoriser le partage de l'audio de l'onglet YouTube."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void audio.enableAudio()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {audio.state === "ready" ? "Re-capturer" : "Activer l'audio"}
        </button>
      </div>
      {audio.errorMessage ? (
        <p className="mt-2 text-xs text-red-600">{audio.errorMessage}</p>
      ) : null}
    </section>
  );
}

export default function HostRoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [hostId] = useState(() => ensureHostId());

  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [state, setState] = useState<LocalState>({
    status: "lobby",
    mode: "buzz",
    trackIndex: 0,
    currentBuzzer: null,
    scores: [],
    leaderboard: [],
    submissions: {},
    resolved: false,
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
  const [presenceChannel, setPresenceChannel] = useState<PresenceChannel | null>(null);
  const playerRef = useRef<YoutubePlayerRef | null>(null);

  const audio = useAudioBroadcaster({ hostId, presenceChannel });
  const chat = useChat({ code, authorId: hostId, isHost: true, channel: presenceChannel });

  // We can't reference `audio` from inside the presence callbacks (closure
  // would capture the first render's instance). Instead we react to `members`
  // changes below, which is enough — the broadcaster ignores connect/disconnect
  // for unknown peers.

  // Subscribe to presence (members count) and event channels.
  useEffect(() => {
    const presence = subscribePresence(
      { code, playerId: hostId, nickname: "Host" },
      {
        onSubscriptionSucceeded: (list) => setMembers(list.filter((m) => m.id !== hostId)),
        onMemberAdded: (m) => setMembers((prev) => (m.id === hostId ? prev : [...prev, m])),
        onMemberRemoved: (m) => setMembers((prev) => prev.filter((x) => x.id !== m.id)),
      },
    );
    // Lift the presence channel out of this effect so the audio broadcaster hook can attach to it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresenceChannel(presence.channel);
    const channel = subscribeChannel(`presence-room-${code}`);
    const privateHost = subscribeChannel(`private-host-${code}`);
    channel.bind("buzz:taken", (payload: { playerId: string; nickname: string }) => {
      setState((s) => ({ ...s, currentBuzzer: payload }));
      playerRef.current?.pause();
    });
    channel.bind("round:resolved", (payload: { outcome: RoundOutcome; scores: ScoreEntry[] }) => {
      setState((s) => ({ ...s, currentBuzzer: null, scores: payload.scores }));
    });
    channel.bind("track:ready", (payload: { trackIndex: number }) => {
      setState((s) => ({
        ...s,
        trackIndex: payload.trackIndex,
        currentBuzzer: null,
        submissions: {},
        resolved: false,
      }));
    });
    channel.bind("game:finished", (payload: { leaderboard: ScoreEntry[] }) => {
      setState((s) => ({ ...s, status: "finished", leaderboard: payload.leaderboard }));
    });
    channel.bind("game:started", () => {
      setState((s) => ({ ...s, status: "playing" }));
    });
    channel.bind("room:mode-changed", (payload: { mode: RoomMode }) => {
      setState((s) => ({ ...s, mode: payload.mode }));
    });
    channel.bind(
      "submission:received",
      (payload: { playerId: string; nickname: string; hasTitle: boolean; hasArtist: boolean }) => {
        setState((s) => ({
          ...s,
          submissions: {
            ...s.submissions,
            [payload.playerId]: {
              ...(s.submissions[payload.playerId] ?? {}),
              playerId: payload.playerId,
              nickname: payload.nickname,
              hasTitle: payload.hasTitle,
              hasArtist: payload.hasArtist,
            },
          },
        }));
      },
    );
    privateHost.bind(
      "submission:received:host",
      (payload: { playerId: string; nickname: string; title?: string; artist?: string }) => {
        setState((s) => ({
          ...s,
          submissions: {
            ...s.submissions,
            [payload.playerId]: {
              ...(s.submissions[payload.playerId] ?? {}),
              playerId: payload.playerId,
              nickname: payload.nickname,
              title: payload.title,
              artist: payload.artist,
            },
          },
        }));
      },
    );
    channel.bind(
      "round:resolved:input",
      (payload: {
        expectedTitle: string;
        expectedArtist: string;
        submissions: SubmissionEntry[];
        scores: ScoreEntry[];
      }) => {
        const map: Record<string, SubmissionEntry> = {};
        for (const s of payload.submissions) map[s.playerId] = s;
        setState((s) => ({ ...s, resolved: true, submissions: map, scores: payload.scores }));
      },
    );
    channel.bind(
      "score:adjusted",
      (payload: { playerId: string; outcome: InputOutcome; scores: ScoreEntry[] }) => {
        setState((s) => ({
          ...s,
          submissions: {
            ...s.submissions,
            [payload.playerId]: {
              ...(s.submissions[payload.playerId] ?? { playerId: payload.playerId, nickname: "" }),
              outcome: payload.outcome,
            },
          },
          scores: payload.scores,
        }));
      },
    );
    return () => {
      presence.unsubscribe();
      setPresenceChannel(null);
      // Channel unsubscribe handled by client.unsubscribe in subscribePresence;
      // for non-presence we fire the same call:
      const client = (window as unknown as { Pusher?: unknown }).Pusher;
      void client; // no-op; the singleton manages teardown on next reload
    };
  }, [code, hostId]);

  const memberIdsKey = useMemo(
    () =>
      members
        .map((m) => m.id)
        .sort()
        .join(","),
    [members],
  );

  // Reconcile audio peers with the current presence list. Connect once per
  // joining member; disconnect when they leave. The broadcaster idempotently
  // handles repeated connects / disconnects for unknown peers.
  useEffect(() => {
    const known = new Set(audio.playerStates.keys());
    const present = new Set(members.map((m) => m.id));
    for (const id of present) {
      if (!known.has(id)) audio.connectPlayer(id);
    }
    for (const id of known) {
      if (!present.has(id)) audio.disconnectPlayer(id);
    }
    // memberIdsKey is the React-stable signal that members has changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIdsKey, audio.playerStates, audio.connectPlayer, audio.disconnectPlayer]);

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
  const setMode = (mode: RoomMode) => callApi("/set-mode", { hostId, mode });
  const resolveInput = () => callApi("/resolve-input", { hostId });
  const override = (playerId: string, outcome: InputOutcome) =>
    callApi("/override-outcome", { hostId, playerId, outcome });
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
                <li key={m.id} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                  <AudioStateDot state={audio.playerStates.get(m.id)} />
                  <span>{m.info.nickname}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AudioControls audio={audio} />

        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-semibold">Mode de réponse</div>
          <div className="mt-2 inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => void setMode("buzz")}
              className={`px-3 py-1.5 text-sm ${state.mode === "buzz" ? "bg-blue-600 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
            >
              Buzz
            </button>
            <button
              type="button"
              onClick={() => void setMode("input")}
              className={`px-3 py-1.5 text-sm ${state.mode === "input" ? "bg-blue-600 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
            >
              Saisie
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {state.mode === "buzz"
              ? "Les joueurs buzzent. Vous validez vocalement."
              : "Les joueurs saisissent titre + auteur. Validation automatique avec override possible."}
          </p>
        </section>

        <button
          type="button"
          onClick={() => {
            if (audio.state !== "ready") {
              const ok = window.confirm(
                "L'audio n'est pas activé. Démarrer quand même ? Les joueurs n'entendront rien.",
              );
              if (!ok) return;
            }
            void start();
          }}
          disabled={members.length === 0}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Démarrer la partie
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <ChatPanel chat={chat} isHost className="mt-6" />
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
            {" · Mode : "}
            <span className="font-semibold">{state.mode === "buzz" ? "Buzz" : "Saisie"}</span>
          </span>
          <span>
            {state.mode === "buzz"
              ? state.currentBuzzer
                ? `${state.currentBuzzer.nickname} a buzzé`
                : "En attente"
              : `${Object.keys(state.submissions).length}/${members.length} ont répondu`}
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

        {state.mode === "buzz" ? (
          state.currentBuzzer ? (
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
          )
        ) : (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Soumissions</h3>
              {!state.resolved ? (
                <button
                  type="button"
                  onClick={() => void resolveInput()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Fin du tour
                </button>
              ) : null}
            </div>
            {members.length === 0 ? (
              <p className="text-zinc-500">Aucun joueur connecté.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const sub = state.submissions[m.id];
                  return (
                    <li
                      key={m.id}
                      className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">{m.info.nickname}</div>
                        <div className="text-xs text-zinc-500">
                          {sub
                            ? sub.title || sub.artist
                              ? `${sub.title ?? "—"} / ${sub.artist ?? "—"}`
                              : "soumission reçue"
                            : "en attente…"}
                        </div>
                      </div>
                      {state.resolved && sub ? (
                        <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700">
                          {(["correct", "half", "wrong"] as InputOutcome[]).map((o) => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => void override(m.id, o)}
                              className={`px-2 py-1 text-xs ${sub.outcome === o ? "bg-blue-600 text-white" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                            >
                              {o === "correct" ? "1pt" : o === "half" ? "0.5" : "0"}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => validate("skip")}
              className="mt-3 rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Passer ce morceau
            </button>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <AudioControls audio={audio} />
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Scores</h2>
          <ul className="space-y-1">
            {state.scores
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((s) => (
                <li key={s.playerId} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AudioStateDot state={audio.playerStates.get(s.playerId)} />
                    <span>{s.nickname}</span>
                  </span>
                  <span className="font-bold">{s.score}</span>
                </li>
              ))}
          </ul>
        </div>
        <ChatPanel chat={chat} isHost />
      </aside>
    </main>
  );
}
