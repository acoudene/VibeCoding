export type PresenceAuthRequest = {
  socketId: string;
  channelName: string;
  user: { id: string; info: { nickname: string } };
};

export type PresenceAuthResponse = {
  auth: string;
  channel_data?: string;
};

export type RealtimeChannel = {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
  authorizePresence(req: PresenceAuthRequest): Promise<PresenceAuthResponse>;
};
