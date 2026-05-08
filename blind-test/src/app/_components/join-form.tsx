"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoomCode } from "@/domain/room-code";

export function JoinForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const upper = value.trim().toUpperCase();
    if (!RoomCode.isValid(upper)) {
      setError("Code invalide. 6 caractères, alphabet sans O/0/I/1.");
      return;
    }
    router.push(`/play/${upper}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <input
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder="ABCDEF"
        maxLength={6}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-2xl font-mono uppercase tracking-[0.4em] focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        disabled={value.trim().length !== 6}
      >
        Rejoindre
      </button>
    </form>
  );
}
