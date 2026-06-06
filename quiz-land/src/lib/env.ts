// Validation centralisée des variables d'environnement.
// Les variables NEXT_PUBLIC_* sont lisibles côté client.

import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
});

const publicSchema = z.object({
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1),
});

// Côté serveur : valide tout. On ne jette pas à l'import pour ne pas casser le build
// quand les clés ne sont pas encore configurées ; on logge un avertissement.
function safeParseServer() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success && typeof window === "undefined") {
    console.warn(
      "[env] Variables serveur manquantes/incorrectes :",
      parsed.error.flatten().fieldErrors,
    );
  }
  return parsed;
}

export const serverEnv = safeParseServer().data ?? {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  PUSHER_APP_ID: process.env.PUSHER_APP_ID ?? "",
  PUSHER_SECRET: process.env.PUSHER_SECRET ?? "",
};

export const publicEnv = {
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY ?? "",
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "",
};

export { publicSchema, serverSchema };
