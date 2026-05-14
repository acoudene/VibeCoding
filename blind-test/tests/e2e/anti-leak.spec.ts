import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const SECRET_TITLE = "Some-Very-Distinctive-Title";
const SECRET_ARTIST = "Distinctive-Artist-Name";
const SECRET_VIDEO_ID = "abcDEF12345";

const PLAYLIST = {
  id: "pl-leak",
  name: "Leak fixture",
  tracks: [
    { expectedTitle: SECRET_TITLE, expectedArtist: SECRET_ARTIST, youtubeId: SECRET_VIDEO_ID },
  ],
};

test.describe("Anti-leak: player view never exposes track metadata", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("DOM, document title and iframes are clean of any expected* / videoId", async ({
    browser,
    request,
  }) => {
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-leak", playlist: PLAYLIST },
    });
    expect(create.ok()).toBe(true);
    const { code } = (await create.json()) as { code: string };

    const playerCtx = await browser.newContext();
    const player = await playerCtx.newPage();
    await player.goto(`/play/${code}`);
    await player.getByPlaceholder("Ton pseudo").fill("Bob");
    await player.getByRole("button", { name: "Rejoindre" }).click();
    await expect(player.getByText("L'hôte va démarrer la partie…")).toBeVisible();

    const start = await request.post(`/api/rooms/${code}/start`, {
      data: { hostId: "host-leak" },
    });
    expect(start.ok()).toBe(true);

    // Wait until the playing UI is up.
    await expect(player.getByRole("button", { name: /Buzz/i })).toBeVisible({ timeout: 10_000 });

    const html = await player.content();
    expect(html, "expectedTitle must not appear in the DOM").not.toContain(SECRET_TITLE);
    expect(html, "expectedArtist must not appear in the DOM").not.toContain(SECRET_ARTIST);
    expect(html, "videoId must not appear in the DOM").not.toContain(SECRET_VIDEO_ID);

    const docTitle = await player.title();
    expect(docTitle).not.toContain(SECRET_TITLE);
    expect(docTitle).not.toContain(SECRET_ARTIST);

    await expect(player.locator('iframe[src*="youtube.com"]')).toHaveCount(0);
    await expect(player.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(0);

    await playerCtx.close();
  });
});
