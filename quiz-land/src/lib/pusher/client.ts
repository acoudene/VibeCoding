// Client Pusher côté navigateur (abonnement aux canaux presence).
"use client";

import PusherClient from "pusher-js";
import { publicEnv } from "@/lib/env";

let instance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!instance) {
    instance = new PusherClient(publicEnv.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      // L'auth des canaux presence passe par notre route /api/pusher/auth (Clerk).
      authEndpoint: "/api/pusher/auth",
    });
  }
  return instance;
}

export function isPusherConfiguredClient(): boolean {
  return Boolean(
    publicEnv.NEXT_PUBLIC_PUSHER_KEY && publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
  );
}
