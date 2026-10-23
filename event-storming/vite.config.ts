import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/web", emptyOutDir: true },
  // En développement, l'API est servie par `wrangler dev` (Miniflare, sans compte Cloudflare).
  server: { proxy: { "/api": "http://localhost:8787" } },
});
