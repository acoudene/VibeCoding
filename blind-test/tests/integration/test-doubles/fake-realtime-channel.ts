import type {
  PresenceAuthRequest,
  PresenceAuthResponse,
  RealtimeChannel,
} from "@/application/ports/realtime-channel";

export type PublishedEvent = {
  channel: string;
  event: string;
  payload: unknown;
};

export class FakeRealtimeChannel implements RealtimeChannel {
  readonly published: PublishedEvent[] = [];

  async publish(channel: string, event: string, payload: unknown): Promise<void> {
    this.published.push({ channel, event, payload });
  }

  async authorizePresence(req: PresenceAuthRequest): Promise<PresenceAuthResponse> {
    return { auth: `fake-auth:${req.user.id}:${req.channelName}` };
  }

  eventsOn(channel: string): PublishedEvent[] {
    return this.published.filter((e) => e.channel === channel);
  }

  lastEvent(channel: string): PublishedEvent | undefined {
    return this.eventsOn(channel).at(-1);
  }
}
