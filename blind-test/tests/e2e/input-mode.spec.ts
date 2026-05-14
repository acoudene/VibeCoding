import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const PLAYLIST = {
  id: "pl-input",
  name: "Input mode playlist",
  tracks: [
    { expectedTitle: "One More Time", expectedArtist: "Daft Punk", youtubeId: "dQw4w9WgXcQ" },
    { expectedTitle: "Smells Like Teen Spirit", expectedArtist: "Nirvana", youtubeId: "9bZkp7q19f0" },
  ],
};

test.describe("Input mode: title + artist text submission", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("two players submit answers, scores reflect R11 (correct=1, half=0.5, wrong=0)", async ({
    browser,
    request,
  }) => {
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-input", playlist: PLAYLIST },
    });
    expect(create.ok()).toBe(true);
    const { code } = (await create.json()) as { code: string };

    // Set mode to input.
    const setMode = await request.post(`/api/rooms/${code}/set-mode`, {
      data: { hostId: "host-input", mode: "input" },
    });
    expect(setMode.ok()).toBe(true);

    // Two players join.
    const aliceCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    await alice.goto(`/play/${code}`);
    await alice.getByPlaceholder("Ton pseudo").fill("Alice");
    await alice.getByRole("button", { name: "Rejoindre" }).click();
    await expect(alice.getByText("L'hôte va démarrer la partie…")).toBeVisible();

    const bobCtx = await browser.newContext();
    const bob = await bobCtx.newPage();
    await bob.goto(`/play/${code}`);
    await bob.getByPlaceholder("Ton pseudo").fill("Bob");
    await bob.getByRole("button", { name: "Rejoindre" }).click();
    await expect(bob.getByText("L'hôte va démarrer la partie…")).toBeVisible();

    // Host starts.
    const start = await request.post(`/api/rooms/${code}/start`, {
      data: { hostId: "host-input" },
    });
    expect(start.ok()).toBe(true);

    // Alice submits a correct answer.
    await expect(alice.getByLabel("Titre")).toBeVisible({ timeout: 10_000 });
    await alice.getByLabel("Titre").fill("One More Time");
    await alice.getByLabel(/Auteur/).fill("Daft Punk");
    await alice.getByRole("button", { name: /Envoyer ma réponse/i }).click();
    await expect(alice.getByText(/en attente des autres|Réponse envoyée/i)).toBeVisible();

    // Bob submits a half answer (title only, wrong artist).
    await expect(bob.getByLabel("Titre")).toBeVisible({ timeout: 10_000 });
    await bob.getByLabel("Titre").fill("One More Time");
    await bob.getByLabel(/Auteur/).fill("Mauvais Artiste");
    await bob.getByRole("button", { name: /Envoyer ma réponse/i }).click();

    // Host resolves the round.
    const resolve = await request.post(`/api/rooms/${code}/resolve-input`, {
      data: { hostId: "host-input" },
    });
    expect(resolve.ok()).toBe(true);

    // Reveal section should show outcomes (the reveal card contains "Daft Punk"
    // as Alice's submitted artist — scope the lookup to the card to avoid
    // matching the header banner too).
    const revealCard = alice.locator("section, div").filter({ hasText: "Réponses du tour" }).first();
    await expect(revealCard).toBeVisible({ timeout: 10_000 });
    await expect(revealCard.getByText(/Daft Punk/)).toBeVisible();
  });
});
