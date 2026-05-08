import { test as base } from "@playwright/test";

// Run Pusher-dependent specs only when env vars are wired (CI with soketi).
// Locally, set them up via .env.local or skip with `pnpm test:e2e --grep-invert "@needs-pusher"`.
const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

export const test = base.extend({});

export const skipIfNoPusher = () =>
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

export { expect } from "@playwright/test";
