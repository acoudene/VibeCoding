import Pusher from "pusher";

import type {
  PresenceAuthRequest,
  PresenceAuthResponse,
  PrivateAuthRequest,
  RealtimeChannel,
} from "@/application/ports/realtime-channel";

import type { PusherServerConfig } from "./pusher-config";

// Minimal surface of the pusher server SDK that we use, so we can mock it
// in tests without pulling the real socket layer.
export type PusherServerLike = {
  trigger(channel: string, event: string, data: unknown): Promise<unknown>;
  authorizeChannel(
    socketId: string,
    channelName: string,
    presenceData?: { user_id: string; user_info?: Record<string, unknown> },
  ): { auth: string; channel_data?: string };
};

function buildClient(config: PusherServerConfig): PusherServerLike {
  return new Pusher({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    cluster: config.cluster,
    useTLS: config.useTLS,
    host: config.host,
    port: config.port,
  });
}

export class PusherRealtimeChannel implements RealtimeChannel {
  private readonly client: PusherServerLike;

  constructor(deps: { config: PusherServerConfig } | { client: PusherServerLike }) {
    this.client = "client" in deps ? deps.client : buildClient(deps.config);
  }

  async publish(channel: string, event: string, payload: unknown): Promise<void> {
    await this.client.trigger(channel, event, payload);
  }

  async authorizePresence(req: PresenceAuthRequest): Promise<PresenceAuthResponse> {
    const auth = this.client.authorizeChannel(req.socketId, req.channelName, {
      user_id: req.user.id,
      user_info: req.user.info as unknown as Record<string, unknown>,
    });
    return { auth: auth.auth, channel_data: auth.channel_data };
  }

  async authorizePrivate(req: PrivateAuthRequest): Promise<PresenceAuthResponse> {
    const auth = this.client.authorizeChannel(req.socketId, req.channelName);
    return { auth: auth.auth, channel_data: auth.channel_data };
  }
}
