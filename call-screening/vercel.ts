import type { VercelConfig } from "@vercel/config/v1";

/**
 * Configuration de déploiement Vercel (Next.js).
 * La base PostgreSQL est fournie par une intégration Neon du Vercel Marketplace,
 * qui renseigne automatiquement `DATABASE_URL`.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",
};
