"use client";

import { useParams } from "next/navigation";
import type { PresenceChannel } from "pusher-js";
import { useEffect, useState } from "react";

import { RoomCode } from "@/domain/room-code";
import { subscribeChannel, subscribePresence } from "@/infrastructure/realtime/pusher-client";

import { ChatPanel } from "../../_components/chat-panel";
import { useChat } from "../../_lib/use-chat";
import { getSession, newPlayerId, setSession } from "../_lib/session";
import { useAudioReceiver } from "./_lib/use-audio-receiver";

type RoomStatus = "lobby" | "playing" | "finished";
type RoomMode = "buzz" | "input";
type InputOutcome = "correct" | "half" | "wrong";
type ScoreEntry = { playerId: string; nickname: string; score: number };

type RevealedSubmission = {
  playerId: string;
  nickname: string;
  title?: string;
  artist?: string;
  outcome: InputOutcome;
};

type LocalState = {
  status: RoomStatus;
  mode: RoomMode;
  trackIndex: number;
  currentBuzzer: { playerId: string; nickname: string } | null;
  scores: ScoreEntry[];
  blocked: boolean;
  buzzedSelf: boolean;
  submitted: boolean;
  submittersMasked: { playerId: string; nickname: string }[];
  resolvedReveal: { expectedTitle: string; expectedArtist: string; submissions: RevealedSubmission[] } | null;
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
    mode: "buzz",
    trackIndex: 0,
    currentBuzzer: null,
    scores: [],
    blocked: false,
    buzzedSelf: false,
    submitted: false,
    submittersMasked: [],
    resolvedReveal: null,
  });
  const [presenceChannel, setPresenceChannel] = useState<PresenceChannel | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [presenceReady, setPresenceReady] = useState(false);
  const audio = useAudioReceiver({
    selfId: me?.playerId ?? "",
    hostId: hostId ?? "",
    presenceChannel: hostId ? presenceChannel : null,
  });
  const chat = useChat({
    code,
    authorId: me?.playerId ?? "",
    isHost: false,
    channel: me ? presenceChannel : null,
  });

  // Auto-reconnect if session exists; pick up the room mode from the server.
  useEffect(() => {
    if (!me) return;
    fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: me.playerId, nickname: me.nickname }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json().catch(() => ({}))) as { mode?: RoomMode };
        if (body.mode === "buzz" || body.mode === "input") {
          const initialMode = body.mode;
          setState((s) => ({ ...s, mode: initialMode }));
        }
      })
      .catch(() => {
        /* noop — server may already know us; UI keeps playing anyway */
      });
  }, [me, code]);

  // Realtime subscription (after join succeeds).
  useEffect(() => {
    if (!me) return;
    const presence = subscribePresence(
      {
        code,
        playerId: me.playerId,
        nickname: me.nickname,
      },
      {
        onSubscriptionSucceeded: (members) => {
          const host = members.find((m) => m.info.nickname === "Host");
          if (host) setHostId(host.id);
          setPresenceReady(true);
        },
        onMemberAdded: (m) => {
          if (m.info.nickname === "Host") setHostId(m.id);
        },
        onMemberRemoved: (m) => {
          if (m.info.nickname === "Host") setHostId(null);
        },
      },
    );
    // Lift the presence channel out of this effect so child hooks (audio receiver) can use it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresenceChannel(presence.channel);
    const channel = subscribeChannel(`presence-room-${code}`);
    channel.bind("game:started", () => {
      setState((s) => ({ ...s, status: "playing" }));
    });
    channel.bind("track:ready", (payload: { trackIndex: number }) => {
      // Keep `resolvedReveal` so players can still read the previous round's
      // result while the next track is loading. It will be cleared as soon as
      // a new submission flows in (or, in buzz mode, a new buzz happens).
      setState((s) => ({
        ...s,
        trackIndex: payload.trackIndex,
        currentBuzzer: null,
        blocked: false,
        buzzedSelf: false,
        submitted: false,
        submittersMasked: [],
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
    channel.bind("room:mode-changed", (payload: { mode: RoomMode }) => {
      setState((s) => ({ ...s, mode: payload.mode }));
    });
    channel.bind(
      "submission:received",
      (payload: { playerId: string; nickname: string }) => {
        setState((s) => {
          if (s.submittersMasked.some((x) => x.playerId === payload.playerId)) return s;
          return {
            ...s,
            // A new submission means the previous round's reveal is stale.
            resolvedReveal: null,
            submittersMasked: [
              ...s.submittersMasked,
              { playerId: payload.playerId, nickname: payload.nickname },
            ],
          };
        });
      },
    );
    channel.bind(
      "round:resolved:input",
      (payload: {
        expectedTitle: string;
        expectedArtist: string;
        submissions: RevealedSubmission[];
        scores: ScoreEntry[];
      }) => {
        setState((s) => ({
          ...s,
          resolvedReveal: {
            expectedTitle: payload.expectedTitle,
            expectedArtist: payload.expectedArtist,
            submissions: payload.submissions,
          },
          scores: payload.scores,
        }));
      },
    );
    channel.bind(
      "score:adjusted",
      (payload: { playerId: string; outcome: InputOutcome; scores: ScoreEntry[] }) => {
        setState((s) => ({
          ...s,
          scores: payload.scores,
          resolvedReveal: s.resolvedReveal
            ? {
                ...s.resolvedReveal,
                submissions: s.resolvedReveal.submissions.map((sub) =>
                  sub.playerId === payload.playerId ? { ...sub, outcome: payload.outcome } : sub,
                ),
              }
            : s.resolvedReveal,
        }));
      },
    );
    channel.bind("game:finished", (payload: { leaderboard: ScoreEntry[] }) => {
      setState((s) => ({ ...s, status: "finished", scores: payload.leaderboard }));
    });
    return () => {
      presence.unsubscribe();
      setPresenceChannel(null);
      setHostId(null);
      setPresenceReady(false);
    };
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
    const body = (await res.json().catch(() => ({}))) as { mode?: RoomMode };
    if (body.mode === "buzz" || body.mode === "input") {
      const initialMode = body.mode;
      setState((s) => ({ ...s, mode: initialMode }));
    }
    const session = { playerId, nickname: nicknameInput.trim() };
    setSession(code, session);
    setMe(session);
  };

  const submitAnswer = async (title: string, artist: string) => {
    if (!me || state.submitted) return;
    setError(null);
    const t = title.trim();
    const a = artist.trim();
    if (t.length === 0 && a.length === 0) {
      setError("Renseigne au moins le titre ou l'auteur.");
      return;
    }
    const res = await fetch(`/api/rooms/${code}/submit-answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: me.playerId, title: t, artist: a }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? `Erreur ${res.status}`);
      return;
    }
    setState((s) => ({ ...s, submitted: true }));
  };

  const buzz = async () => {
    if (!me || state.blocked || state.currentBuzzer || state.buzzedSelf) return;
    setState((s) => ({ ...s, buzzedSelf: true }));
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    const send = () =>
      fetch(`/api/rooms/${code}/buzz`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId: me.playerId }),
      });
    // Auto-retry through the post-track grace period (R9 — 500 ms server-side).
    // The user already pressed; we want them to be in line as soon as the server allows it.
    const deadline = Date.now() + 1500;
    let res = await send();
    while (!res.ok && Date.now() < deadline) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (body.error !== "BuzzTooEarlyError") break;
      await new Promise((r) => setTimeout(r, 60));
      res = await send();
    }
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
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{me.nickname}</h1>
          <p className="mt-2 text-zinc-500">Salle {code}</p>
          <div className="mt-12 text-lg text-zinc-700 dark:text-zinc-300">
            {presenceReady ? "L'hôte va démarrer la partie…" : "Connexion…"}
          </div>
        </div>
        <div className="mt-8">
          <ChatPanel chat={chat} isHost={false} />
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
        {state.resolvedReveal ? (
          <div className="mt-6 w-full rounded-xl border border-zinc-200 bg-white p-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-2 font-semibold">Réponses du tour</h3>
            <p className="mb-2 text-zinc-500">
              Réponse : {state.resolvedReveal.expectedTitle} — {state.resolvedReveal.expectedArtist}
            </p>
            <ul className="space-y-1">
              {state.resolvedReveal.submissions.map((sub) => (
                <li key={sub.playerId} className="flex items-center justify-between">
                  <span className="flex-1">
                    <span className="font-medium">{sub.nickname}</span>
                    <span className="ml-2 text-zinc-500">
                      {sub.title || sub.artist
                        ? `${sub.title ?? "—"} / ${sub.artist ?? "—"}`
                        : "n'a pas répondu"}
                    </span>
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      sub.outcome === "correct"
                        ? "bg-green-100 text-green-800"
                        : sub.outcome === "half"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {sub.outcome}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    );
  }

  // playing
  const canBuzz = !state.blocked && !state.currentBuzzer && !state.buzzedSelf;
  const banner =
    state.mode === "buzz"
      ? state.currentBuzzer
        ? `${state.currentBuzzer.nickname} a buzzé`
        : state.blocked
          ? "Tu as répondu faux — tu ne peux plus buzzer ce tour"
          : `Track ${state.trackIndex + 1} en lecture`
      : state.resolvedReveal
        ? `Réponse : ${state.resolvedReveal.expectedTitle} — ${state.resolvedReveal.expectedArtist}`
        : state.submitted
          ? "Réponse envoyée — en attente des autres"
          : `Track ${state.trackIndex + 1} en lecture — saisis ta réponse`;

  return (
    <main className="flex min-h-dvh w-full flex-col">
      <header className="px-6 pt-6 pb-3 text-center text-sm text-zinc-500">{banner}</header>
      {state.mode === "buzz" ? (
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
      ) : (
        <InputAnswerSection
          submitted={state.submitted}
          submittersMasked={state.submittersMasked}
          resolvedReveal={state.resolvedReveal}
          myPlayerId={me.playerId}
          onSubmit={submitAnswer}
          error={error}
        />
      )}
      <section className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span aria-label="Statut audio" className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                audio.state === "connected"
                  ? "bg-emerald-500"
                  : audio.state === "connecting"
                    ? "bg-amber-500"
                    : audio.state === "failed"
                      ? "bg-red-500"
                      : "bg-zinc-400"
              }`}
            />
            <span>
              {audio.state === "connected"
                ? "Audio connecté"
                : audio.state === "connecting"
                  ? "Connexion audio…"
                  : audio.state === "failed"
                    ? "Audio indisponible"
                    : "Audio en attente"}
            </span>
          </span>
          {audio.state === "failed" ? (
            <button
              type="button"
              onClick={audio.retry}
              className="rounded px-2 py-1 text-blue-600 underline"
            >
              Réessayer
            </button>
          ) : null}
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            defaultValue={1}
            onChange={(e) => audio.setVolume(Number(e.target.value))}
            className="ml-2 w-24"
          />
        </div>
      </section>
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
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <ChatPanel chat={chat} isHost={false} />
      </div>
    </main>
  );
}

function InputAnswerSection({
  submitted,
  submittersMasked,
  resolvedReveal,
  myPlayerId,
  onSubmit,
  error,
}: {
  submitted: boolean;
  submittersMasked: { playerId: string; nickname: string }[];
  resolvedReveal: LocalState["resolvedReveal"];
  myPlayerId: string;
  onSubmit: (title: string, artist: string) => Promise<void>;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(title, artist);
  };

  return (
    <section className="flex flex-1 flex-col gap-4 px-4 py-6">
      {!resolvedReveal ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <label className="text-sm font-medium">
            Titre
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              maxLength={100}
              disabled={submitted}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Titre du morceau"
            />
          </label>
          <label className="text-sm font-medium">
            Auteur / artiste
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value.slice(0, 100))}
              maxLength={100}
              disabled={submitted}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Nom de l'artiste"
            />
          </label>
          <button
            type="submit"
            disabled={submitted || (title.trim().length === 0 && artist.trim().length === 0)}
            className="rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitted ? "Envoyée" : "Envoyer ma réponse"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      ) : null}

      {!resolvedReveal && submittersMasked.length > 0 ? (
        <ul className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {submittersMasked.map((s) => (
            <li key={s.playerId} className="flex items-center justify-between">
              <span>{s.nickname}</span>
              <span className="text-zinc-400">•••</span>
            </li>
          ))}
        </ul>
      ) : null}

      {resolvedReveal ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 font-semibold">Réponses du tour</h3>
          <ul className="space-y-1">
            {resolvedReveal.submissions.map((sub) => (
              <li
                key={sub.playerId}
                className={`flex items-center justify-between rounded px-2 py-1 ${sub.playerId === myPlayerId ? "bg-blue-50 dark:bg-blue-950" : ""}`}
              >
                <span className="flex-1">
                  <span className="font-medium">{sub.nickname}</span>
                  <span className="ml-2 text-zinc-500">
                    {sub.title || sub.artist
                      ? `${sub.title ?? "—"} / ${sub.artist ?? "—"}`
                      : "n'a pas répondu"}
                  </span>
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    sub.outcome === "correct"
                      ? "bg-green-100 text-green-800"
                      : sub.outcome === "half"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {sub.outcome === "correct" ? "1pt" : sub.outcome === "half" ? "0.5" : "0"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
