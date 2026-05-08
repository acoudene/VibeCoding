"use client";

const HOST_KEY = "bt:hostId:v1";

export function ensureHostId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(HOST_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    window.localStorage.setItem(HOST_KEY, id);
  }
  return id;
}
