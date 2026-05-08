"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { RoomCode } from "@/domain/room-code";
import { subscribeChannel } from "@/infrastructure/realtime/pusher-client";

import { getSession, newPlayerId, setSession } from "../_lib/session";

type RoomStatus = "lobby" | "playing" | "finished";
type ScoreEntry = { playerId: string; nickname: string; score: number };

type LocalState = {
  status: RoomStatus;
  trackIndex: number;
  currentBuzzer: { playerId: string; nickname: string } | null;
  scores: ScoreEntry[];
  blocked: boolean;
  buzzedSelf: boolean;
};

export default function PlayerRoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [me, setMe] = useState<{ playerId: string; nickname: string } | null>(() =>
    getSession(code),
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [state, setState] = useState<LocalState>({
    status: "lobby",
    trackIndex: 0,
    currentBuzzer: null,
    scores: [],
    blocked: false,
    buzzedSelf: false,
  });

  // Auto-reconnect if session exists.
  useEffect(() => {
    if (!me) return;
    fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: me.playerId, nickname: me.nickname }),
    }).catch(() => {
      /* noop — server may already know us; UI keeps playing anyway */
    });
  }, [me, code]);

  // Realtime subscription (after join succeeds).
  useEffect(() => {
    if (!me) return;
    const channel = subscribeChannel(`room-${code}`);
    channel.bind("game:started", () => {
      setState((s) => ({ ...s, status: "playing" }));
    });
    channel.bind("track:ready", (payload: { trackIndex: number }) => {
      setState((s) => ({
        ...s,
        trackIndex: payload.trackIndex,
        currentBuzzer: null,
        blocked: false,
        buzzedSelf: false,
      }));
    });
    channel.bind("buzz:taken", (payload: { playerId: string; nickname: string }) => {
      setState((s) => ({ ...s, currentBuzzer: payload }));
    });
    channel.bind(
      "round:resolved",
      (payload: { outcome: "correct" | "wrong" | "half" | "skip"; scores: ScoreEntry[] }) => {
        setState((s) => {
          const wasMe = s.currentBuzzer?.playerId === me.playerId;
          return {
            ...s,
            currentBuzzer: null,
            scores: payload.scores,
            blocked: payload.outcome === "wrong" && wasMe ? true : s.blocked,
            buzzedSelf: false,
          };
        });
      },
    );
    channel.bind("game:finished", (payload: { leaderboard: ScoreEntry[] }) => {
      setState((s) => ({ ...s, status: "finished", scores: payload.leaderboard }));
    });
  }, [me, code]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!RoomCode.isValid(code)) {
      setError("Code de salle invalide.");
      return;
    }
    if (nicknameInput.trim().length === 0) return;
    setJoining(true);
    setError(null);
    const playerId = newPlayerId();
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId, nickname: nicknameInput.trim() }),
    });
    setJoining(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? `Erreur ${res.status}`);
      return;
    }
    const session = { playerId, nickname: nicknameInput.trim() };
    setSession(code, session);
    setMe(session);
  };

  const buzz = async () => {
    if (!me || state.blocked || state.currentBuzzer || state.buzzedSelf) return;
    setState((s) => ({ ...s, buzzedSelf: true }));
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    const res = await fetch(`/api/rooms/${code}/buzz`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: me.playerId }),
    });
    if (!res.ok) {
      setState((s) => ({ ...s, buzzedSelf: false }));
    }
  };

  if (!me) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
        <h1 className="text-2xl font-bold">Salle {code}</h1>
        <p className="mt-2 text-zinc-500">Choisis un pseudo pour rejoindre.</p>
        <form onSubmit={join} className="mt-6 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Ton pseudo"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            maxLength={20}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg dark:border-zinc-700 dark:bg-zinc-800"
            autoFocus
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={joining || nicknameInput.trim().length === 0}
            className="rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {joining ? "Connexion…" : "Rejoindre"}
          </button>
        </form>
      </main>
    );
  }

  if (state.status === "lobby") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">{me.nickname}</h1>
        <p className="mt-2 text-zinc-500">Salle {code}</p>
        <div className="mt-12 text-lg text-zinc-700 dark:text-zinc-300">
          L&apos;hôte va démarrer la partie…
        </div>
      </main>
    );
  }

  if (state.status === "finished") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-3xl font-bold">Fin de la partie</h1>
        <ol className="mt-6 w-full space-y-2 text-left">
          {state.scores.map((s, i) => (
            <li
              key={s.playerId}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                s.playerId === me.playerId
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <span className="font-mono text-zinc-500">#{i + 1}</span>
              <span className="flex-1 px-3 font-medium">{s.nickname}</span>
              <span className="font-bold">{s.score}</span>
            </li>
          ))}
        </ol>
      </main>
    );
  }

  // playing
  const canBuzz = !state.blocked && !state.currentBuzzer && !state.buzzedSelf;
  const banner = state.currentBuzzer
    ? `${state.currentBuzzer.nickname} a buzzé`
    : state.blocked
      ? "Tu as répondu faux — tu ne peux plus buzzer ce tour"
      : `Track ${state.trackIndex + 1} en lecture`;

  return (
    <main className="flex min-h-dvh w-full flex-col">
      <header className="px-6 pt-6 pb-3 text-center text-sm text-zinc-500">{banner}</header>
      <button
        type="button"
        onClick={buzz}
        disabled={!canBuzz}
        className={`flex flex-1 items-center justify-center text-5xl font-bold uppercase tracking-widest transition ${
          canBuzz
            ? "bg-red-600 text-white active:bg-red-700"
            : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {state.buzzedSelf ? "Buzzé !" : "Buzz"}
      </button>
      <aside className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <ul className="space-y-1 text-sm">
          {state.scores
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((s) => (
              <li
                key={s.playerId}
                className={
                  s.playerId === me.playerId
                    ? "flex justify-between font-bold"
                    : "flex justify-between"
                }
              >
                <span>{s.nickname}</span>
                <span>{s.score}</span>
              </li>
            ))}
        </ul>
      </aside>
    </main>
  );
}
