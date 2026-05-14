import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const PLAYLIST = {
  id: "pl-e2e-skip",
  name: "E2E skip",
  tracks: [
    { expectedTitle: "T1", expectedArtist: "A", youtubeId: "dQw4w9WgXcQ" },
    { expectedTitle: "T2", expectedArtist: "A", youtubeId: "9bZkp7q19f0" },
  ],
};

test.describe("Host can skip a track", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("skip from playing advances to next track without scoring", async ({ browser, request }) => {
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-e2e", playlist: PLAYLIST },
    });
    const { code } = (await create.json()) as { code: string };

    const ctx = await browser.newContext();
    const player = await ctx.newPage();
    await player.goto(`/play/${code}`);
    await player.getByPlaceholder("Ton pseudo").fill("Alice");
    await player.getByRole("button", { name: "Rejoindre" }).click();
    await expect(player.getByText("L'hôte va démarrer la partie…")).toBeVisible();

    await request.post(`/api/rooms/${code}/start`, {
      data: { hostId: "host-e2e" },
    });
    await expect(player.getByText("Track 1 en lecture")).toBeVisible({ timeout: 10_000 });

    await request.post(`/api/rooms/${code}/validate`, {
      data: { hostId: "host-e2e", outcome: "skip" },
    });

    await expect(player.getByText("Track 2 en lecture")).toBeVisible({ timeout: 10_000 });
    // Score is still 0
    await expect(player.locator("li").filter({ hasText: "Alice" }).getByText("0")).toBeVisible();

    await ctx.close();
  });
});
