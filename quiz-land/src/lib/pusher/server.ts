// Client Pusher côté serveur (publication d'événements + auth des canaux presence).
import Pusher from "pusher";
import { publicEnv, serverEnv } from "@/lib/env";

let instance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!instance) {
    instance = new Pusher({
      appId: serverEnv.PUSHER_APP_ID,
      key: publicEnv.NEXT_PUBLIC_PUSHER_KEY,
      secret: serverEnv.PUSHER_SECRET,
      cluster: publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return instance;
}

/** Indique si Pusher est configuré (clés présentes). */
export function isPusherConfigured(): boolean {
  return Boolean(
    serverEnv.PUSHER_APP_ID &&
      serverEnv.PUSHER_SECRET &&
      publicEnv.NEXT_PUBLIC_PUSHER_KEY &&
      publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}

/** Publie un événement sur un canal sans faire échouer la requête en cas d'erreur réseau. */
export async function publish(
  channel: string,
  event: string,
  payload: unknown,
): Promise<void> {
  if (!isPusherConfigured()) return;
  try {
    await getPusherServer().trigger(channel, event, payload);
  } catch (err) {
    console.error(`[pusher] échec publication ${event} sur ${channel}`, err);
  }
}
