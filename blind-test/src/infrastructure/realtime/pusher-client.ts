"use client";

import PusherJs, { type Channel as PusherChannel, type PresenceChannel } from "pusher-js";

import { type PusherClientConfig, readClientConfig } from "./pusher-config";

let singleton: PusherJs | null = null;

// pusher-js takes a single global authorizer at client creation. To support
// per-room identity (playerId + nickname), we keep a registry keyed by room
// code that the authorizer reads at auth time.
type Identity = { code: string; playerId: string; nickname: string };
const identityByCode = new Map<string, Identity>();

function getIdentityForChannel(channelName: string): Identity | null {
  // presence-room-XXXX, room-XXXX, or private-host-XXXX
  const match =
    channelName.match(/-room-([A-Z0-9]+)$/) ?? channelName.match(/-host-([A-Z0-9]+)$/);
  const code = match?.[1];
  if (!code) return null;
  return identityByCode.get(code) ?? null;
}

export function getPusherClient(config: PusherClientConfig = readClientConfig()): PusherJs {
  if (singleton) return singleton;
  singleton = new PusherJs(config.key, {
    cluster: config.cluster,
    forceTLS: config.useTLS,
    wsHost: config.host,
    wsPort: config.port ? Number(config.port) : undefined,
    wssPort: config.port ? Number(config.port) : undefined,
    enabledTransports: config.useTLS ? ["ws", "wss"] : ["ws"],
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        const identity = getIdentityForChannel(channel.name);
        if (!identity) {
          callback(new Error(`No identity registered for channel ${channel.name}`), null);
          return;
        }
        const body = new URLSearchParams({
          socket_id: socketId,
          channel_name: channel.name,
          playerId: identity.playerId,
          nickname: identity.nickname,
        });
        fetch(`/api/rooms/${identity.code}/pusher-auth`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        })
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              callback(new Error(`auth failed: ${res.status} ${text}`), null);
              return;
            }
            const data = (await res.json()) as { auth: string; channel_data?: string };
            callback(null, data);
          })
          .catch((err) => callback(err as Error, null));
      },
    }),
  });
  return singleton;
}

export function resetPusherClient(): void {
  singleton?.disconnect();
  singleton = null;
  identityByCode.clear();
}

export function registerRoomIdentity(identity: Identity): void {
  identityByCode.set(identity.code, identity);
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
  identity: Identity,
  handlers: PresenceHandlers = {},
): { channel: PresenceChannel; unsubscribe: () => void } {
  registerRoomIdentity(identity);
  const client = getPusherClient();
  const channelName = `presence-room-${identity.code}`;
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
