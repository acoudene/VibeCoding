import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const PLAYLIST = {
  id: "pl-e2e",
  name: "E2E playlist",
  tracks: [
    { expectedTitle: "Track A", expectedArtist: "Artist A", youtubeId: "dQw4w9WgXcQ" },
    { expectedTitle: "Track B", expectedArtist: "Artist B", youtubeId: "9bZkp7q19f0" },
  ],
};

test.describe("Happy path: 1 host + 1 player", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("complete a 2-track game with one correct answer per track", async ({
    browser,
    request,
  }) => {
    // Host provisions the room via the API (faster than driving the host UI
    // through a YouTube iframe).
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-e2e", playlist: PLAYLIST },
    });
    expect(create.ok()).toBe(true);
    const { code } = (await create.json()) as { code: string };

    // Player joins via the UI.
    const playerCtx = await browser.newContext();
    const player = await playerCtx.newPage();
    await player.goto(`/play/${code}`);
    await player.getByPlaceholder("Ton pseudo").fill("Alice");
    await player.getByRole("button", { name: "Rejoindre" }).click();
    await expect(player.getByText("L'hôte va démarrer la partie…")).toBeVisible();

    // Host starts the game.
    const start = await request.post(`/api/rooms/${code}/start`, {
      data: { hostId: "host-e2e" },
    });
    expect(start.ok()).toBe(true);

    // Player should see the buzz button.
    await expect(player.getByRole("button", { name: /Buzz/i })).toBeVisible({ timeout: 10_000 });

    // Player buzzes track 1; wait for the server's buzz:taken event to round-trip
    // (banner shows "Alice a buzzé") before the host validates — without this
    // the validate POST can race the buzz POST and the round stays "playing".
    await player.getByRole("button", { name: /^Buzz$/ }).click();
    await expect(player.getByText("Alice a buzzé")).toBeVisible({ timeout: 5_000 });

    const validate1 = await request.post(`/api/rooms/${code}/validate`, {
      data: { hostId: "host-e2e", outcome: "correct" },
    });
    expect(validate1.ok()).toBe(true);

    // After track:ready the player can buzz again on track 2.
    await expect(player.getByRole("button", { name: /^Buzz$/ })).toBeEnabled({ timeout: 10_000 });
    await player.getByRole("button", { name: /^Buzz$/ }).click();
    await expect(player.getByText("Alice a buzzé")).toBeVisible({ timeout: 5_000 });

    const validate2 = await request.post(`/api/rooms/${code}/validate`, {
      data: { hostId: "host-e2e", outcome: "correct" },
    });
    expect(validate2.ok()).toBe(true);

    // End-of-game screen should show Alice with 2 points.
    await expect(player.getByText("Fin de la partie")).toBeVisible({ timeout: 10_000 });
    await expect(player.getByText("Alice")).toBeVisible();
    await expect(player.locator("li").filter({ hasText: "Alice" }).getByText("2")).toBeVisible();

    await playerCtx.close();
  });
});
