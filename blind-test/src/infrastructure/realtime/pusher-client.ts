"use client";

import PusherJs, { type Channel as PusherChannel, type PresenceChannel } from "pusher-js";

import { type PusherClientConfig, readClientConfig } from "./pusher-config";

let singleton: PusherJs | null = null;

export function getPusherClient(config: PusherClientConfig = readClientConfig()): PusherJs {
  if (singleton) return singleton;
  singleton = new PusherJs(config.key, {
    cluster: config.cluster,
    forceTLS: config.useTLS,
    wsHost: config.host,
    wsPort: config.port ? Number(config.port) : undefined,
    wssPort: config.port ? Number(config.port) : undefined,
    enabledTransports: config.useTLS ? ["ws", "wss"] : ["ws"],
    channelAuthorization: {
      endpoint: "/api/pusher-auth",
      transport: "ajax",
    },
  });
  return singleton;
}

export function resetPusherClient(): void {
  singleton?.disconnect();
  singleton = null;
}

export type PresenceMember = { id: string; info: { nickname: string } };

export type PresenceHandlers = {
  onSubscriptionSucceeded?: (members: PresenceMember[]) => void;
  onMemberAdded?: (member: PresenceMember) => void;
  onMemberRemoved?: (member: PresenceMember) => void;
  onError?: (err: unknown) => void;
};

type MembersLike = {
  count: number;
  each: (cb: (m: { id: string; info: { nickname: string } }) => void) => void;
};

export function subscribePresence(
  channelName: string,
  handlers: PresenceHandlers = {},
): { channel: PresenceChannel; unsubscribe: () => void } {
  const client = getPusherClient();
  const channel = client.subscribe(channelName) as PresenceChannel;

  channel.bind("pusher:subscription_succeeded", (members: MembersLike) => {
    if (!handlers.onSubscriptionSucceeded) return;
    const list: PresenceMember[] = [];
    members.each((m) => list.push({ id: m.id, info: m.info }));
    handlers.onSubscriptionSucceeded(list);
  });
  if (handlers.onMemberAdded) channel.bind("pusher:member_added", handlers.onMemberAdded);
  if (handlers.onMemberRemoved) channel.bind("pusher:member_removed", handlers.onMemberRemoved);
  if (handlers.onError) channel.bind("pusher:subscription_error", handlers.onError);

  return {
    channel,
    unsubscribe: () => {
      client.unsubscribe(channelName);
    },
  };
}

export function subscribeChannel(channelName: string): PusherChannel {
  return getPusherClient().subscribe(channelName);
}
