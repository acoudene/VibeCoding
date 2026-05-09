import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const SECRET_TITLE = "ZorglubBlindtestSecretTitle";
const SECRET_ARTIST = "ZorglubBlindtestSecretArtist";
const SECRET_VIDEO_ID = "AAAAAAAAAAA";

const PLAYLIST = {
  id: "pl-leak",
  name: "Anti-leak input mode",
  tracks: [
    { expectedTitle: SECRET_TITLE, expectedArtist: SECRET_ARTIST, youtubeId: SECRET_VIDEO_ID },
  ],
};

test.describe("Input mode anti-leak: opponents' answers and expected stay hidden", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("Bob never sees Alice's submitted title nor the expected answer until reveal", async ({
    browser,
    request,
  }) => {
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-leak", playlist: PLAYLIST },
    });
    expect(create.ok()).toBe(true);
    const { code } = (await create.json()) as { code: string };

    await request.post(`/api/rooms/${code}/set-mode`, {
      data: { hostId: "host-leak", mode: "input" },
    });

    const aliceCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    await alice.goto(`/play/${code}`);
    await alice.getByPlaceholder("Ton pseudo").fill("Alice");
    await alice.getByRole("button", { name: "Rejoindre" }).click();

    const bobCtx = await browser.newContext();
    const bob = await bobCtx.newPage();
    await bob.goto(`/play/${code}`);
    await bob.getByPlaceholder("Ton pseudo").fill("Bob");
    await bob.getByRole("button", { name: "Rejoindre" }).click();

    await request.post(`/api/rooms/${code}/start`, { data: { hostId: "host-leak" } });

    const ALICE_GUESS = "MyVerySpecificAliceGuessXYZ";
    await expect(alice.getByLabel("Titre")).toBeVisible({ timeout: 10_000 });
    await alice.getByLabel("Titre").fill(ALICE_GUESS);
    await alice.getByRole("button", { name: /Envoyer ma réponse/i }).click();

    // Bob's page must not contain Alice's clear submission, the expected, nor the videoId.
    await expect(bob.locator("body")).toContainText("•••", { timeout: 5_000 });
    expect(await bob.content()).not.toContain(ALICE_GUESS);
    expect(await bob.content()).not.toContain(SECRET_TITLE);
    expect(await bob.content()).not.toContain(SECRET_ARTIST);
    expect(await bob.content()).not.toContain(SECRET_VIDEO_ID);

    // After resolve, Alice's submission and the expected become visible to Bob.
    await request.post(`/api/rooms/${code}/resolve-input`, {
      data: { hostId: "host-leak" },
    });
    await expect(bob.getByText("Réponses du tour")).toBeVisible({ timeout: 10_000 });
    await expect(bob.getByText(ALICE_GUESS)).toBeVisible();
  });
});
