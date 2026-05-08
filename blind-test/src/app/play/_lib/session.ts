"use client";

const KEY = (code: string) => `bt:player:${code}`;

export type PlayerSession = { playerId: string; nickname: string };

export function getSession(code: string): PlayerSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function setSession(code: string, session: PlayerSession): void {
  window.sessionStorage.setItem(KEY(code), JSON.stringify(session));
}

export function clearSession(code: string): void {
  window.sessionStorage.removeItem(KEY(code));
}

export function newPlayerId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
