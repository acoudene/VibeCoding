"use client";

import type { Channel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";

export type ChatRole = "host" | "player";

export type ChatMessageView = {
  id: string;
  authorId: string;
  role: ChatRole;
  text: string;
  at: number;
};

export type ChatState = {
  isOpen: boolean;
  messages: ChatMessageView[];
  error: string | null;
  send: (text: string) => Promise<void>;
  toggle: () => Promise<void>;
};

type UseChatOpts = {
  code: string;
  authorId: string;
  isHost: boolean;
  channel: Channel | null;
};

export function useChat({ code, authorId, isHost, channel }: UseChatOpts): ChatState {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Initial history fetch.
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/rooms/${code}/chat`)
      .then((r) => r.json())
      .then((body: { isOpen?: boolean; messages?: ChatMessageView[] }) => {
        if (cancelled) return;
        setIsOpen(body.isOpen ?? true);
        const list = body.messages ?? [];
        setMessages(list);
        seenIds.current = new Set(list.map((m) => m.id));
      })
      .catch(() => {
        // ignore: chat is best-effort
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Live events.
  useEffect(() => {
    if (!channel) return;
    const onMessage = (payload: { message: ChatMessageView }) => {
      if (seenIds.current.has(payload.message.id)) return;
      seenIds.current.add(payload.message.id);
      setMessages((prev) => [...prev, payload.message]);
    };
    const onToggled = (payload: { isOpen: boolean }) => setIsOpen(payload.isOpen);
    channel.bind("chat:message", onMessage);
    channel.bind("chat:toggled", onToggled);
    return () => {
      channel.unbind("chat:message", onMessage);
      channel.unbind("chat:toggled", onToggled);
    };
  }, [channel]);

  const send = useCallback(
    async (text: string) => {
      setError(null);
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      const res = await fetch(`/api/rooms/${code}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorId, text: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? `Erreur ${res.status}`);
      }
    },
    [authorId, code],
  );

  const toggle = useCallback(async () => {
    if (!isHost) return;
    setError(null);
    const res = await fetch(`/api/rooms/${code}/chat-toggle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostId: authorId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? `Erreur ${res.status}`);
    }
  }, [authorId, code, isHost]);

  return { isOpen, messages, error, send, toggle };
}
