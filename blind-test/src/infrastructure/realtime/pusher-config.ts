export type PusherServerConfig = {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
  host?: string;
  port?: string;
  useTLS: boolean;
};

export type PusherClientConfig = {
  key: string;
  cluster: string;
  host?: string;
  port?: string;
  useTLS: boolean;
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): PusherServerConfig {
  return {
    appId: required("PUSHER_APP_ID", env.PUSHER_APP_ID),
    key: required("PUSHER_KEY", env.PUSHER_KEY),
    secret: required("PUSHER_SECRET", env.PUSHER_SECRET),
    cluster: required("PUSHER_CLUSTER", env.PUSHER_CLUSTER),
    host: env.PUSHER_HOST,
    port: env.PUSHER_PORT,
    useTLS: env.PUSHER_USE_TLS !== "false",
  };
}

export function readClientConfig(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    NEXT_PUBLIC_PUSHER_HOST: process.env.NEXT_PUBLIC_PUSHER_HOST,
    NEXT_PUBLIC_PUSHER_PORT: process.env.NEXT_PUBLIC_PUSHER_PORT,
    NEXT_PUBLIC_PUSHER_USE_TLS: process.env.NEXT_PUBLIC_PUSHER_USE_TLS,
  },
): PusherClientConfig {
  return {
    key: required("NEXT_PUBLIC_PUSHER_KEY", env.NEXT_PUBLIC_PUSHER_KEY),
    cluster: required("NEXT_PUBLIC_PUSHER_CLUSTER", env.NEXT_PUBLIC_PUSHER_CLUSTER),
    host: env.NEXT_PUBLIC_PUSHER_HOST,
    port: env.NEXT_PUBLIC_PUSHER_PORT,
    useTLS: env.NEXT_PUBLIC_PUSHER_USE_TLS !== "false",
  };
}
