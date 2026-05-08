"use client";

import type { PresenceChannel } from "pusher-js";

import type { RtcSignal, SignalingChannel } from "./signaling";

const EVENT_BY_KIND = {
  offer: "client-rtc-offer",
  answer: "client-rtc-answer",
  ice: "client-rtc-ice",
} as const;

const KIND_BY_EVENT: Record<string, RtcSignal["kind"]> = {
  "client-rtc-offer": "offer",
  "client-rtc-answer": "answer",
  "client-rtc-ice": "ice",
};

/**
 * Bridges a Pusher presence channel to the abstract SignalingChannel that
 * AudioBroadcaster and AudioReceiver depend on. Uses Pusher client events
 * (no server hop), which require client events to be enabled on the app.
 */
export class PusherSignalingChannel implements SignalingChannel {
  private listeners: ((signal: RtcSignal) => void)[] = [];
  private readonly bound: { event: string; handler: (data: unknown) => void }[] = [];

  constructor(private readonly channel: PresenceChannel) {
    for (const [event, kind] of Object.entries(KIND_BY_EVENT)) {
      const handler = (data: unknown) => this.dispatch(kind, data);
      channel.bind(event, handler);
      this.bound.push({ event, handler });
    }
  }

  send(signal: RtcSignal): void {
    this.channel.trigger(EVENT_BY_KIND[signal.kind], signal);
  }

  subscribe(handler: (signal: RtcSignal) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }

  dispose(): void {
    for (const b of this.bound) this.channel.unbind(b.event, b.handler);
    this.bound.length = 0;
    this.listeners.length = 0;
  }

  private dispatch(kind: RtcSignal["kind"], data: unknown): void {
    if (!isSignalLike(data, kind)) return;
    for (const l of this.listeners) l(data);
  }
}

function isSignalLike(data: unknown, kind: RtcSignal["kind"]): data is RtcSignal {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return o.kind === kind && typeof o.from === "string" && typeof o.to === "string";
}
