"use client";

import { useEffect, useRef, useState } from "react";

import type { ChatState } from "../_lib/use-chat";

const MAX = 200;

export function ChatPanel({
  chat,
  isHost,
  className,
}: {
  chat: ChatState;
  isHost: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages]);

  const disabled = !chat.isOpen && !isHost;
  const remaining = MAX - draft.trim().length;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    await chat.send(text);
  };

  return (
    <section
      className={`flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className ?? ""}`}
    >
      <header className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Tchat</h2>
        {isHost ? (
          <button
            type="button"
            onClick={() => void chat.toggle()}
            className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {chat.isOpen ? "Fermer" : "Ouvrir"}
          </button>
        ) : !chat.isOpen ? (
          <span className="text-xs text-zinc-500">Fermé par l&apos;hôte</span>
        ) : null}
      </header>

      <ul
        ref={listRef}
        className="max-h-72 min-h-32 flex-1 overflow-y-auto px-3 py-2 text-sm"
        aria-live="polite"
      >
        {chat.messages.length === 0 ? (
          <li className="text-zinc-400">Pas encore de messages.</li>
        ) : (
          chat.messages.map((m) => (
            <li key={m.id} className="mb-1">
              <span
                className={`mr-1 font-semibold ${m.role === "host" ? "text-blue-600" : "text-zinc-700 dark:text-zinc-200"}`}
              >
                {m.role === "host" ? "Hôte" : m.authorId}
              </span>
              <span className="text-zinc-800 dark:text-zinc-100">{m.text}</span>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          maxLength={MAX}
          disabled={disabled}
          placeholder={disabled ? "Tchat fermé par l'hôte" : "Écrire un message…"}
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
          aria-label="Message du tchat"
        />
        <button
          type="submit"
          disabled={disabled || draft.trim().length === 0}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
      <div className="px-3 pb-2 text-right text-xs text-zinc-400">
        {remaining < 50 ? `${remaining} caractères restants` : ""}
      </div>
      {chat.error ? (
        <div className="border-t border-zinc-200 px-3 py-2 text-xs text-red-600 dark:border-zinc-800">
          {chat.error}
        </div>
      ) : null}
    </section>
  );
}
