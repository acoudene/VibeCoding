export type TurnEnv = {
  TURN_URL?: string;
  TURN_USERNAME?: string;
  TURN_CREDENTIAL?: string;
};

const DEFAULT_STUN_URLS = ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"];

export function buildIceServers(env: TurnEnv = {}): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: DEFAULT_STUN_URLS }];
  const url = env.TURN_URL?.trim();
  const username = env.TURN_USERNAME?.trim();
  const credential = env.TURN_CREDENTIAL?.trim();
  if (url && username && credential) {
    servers.push({ urls: url, username, credential });
  }
  return servers;
}

export function readClientTurnEnv(): TurnEnv {
  return {
    TURN_URL: process.env.NEXT_PUBLIC_TURN_URL,
    TURN_USERNAME: process.env.NEXT_PUBLIC_TURN_USERNAME,
    TURN_CREDENTIAL: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  };
}

export function buildRtcConfiguration(env?: TurnEnv): RTCConfiguration {
  return { iceServers: buildIceServers(env ?? readClientTurnEnv()) };
}
