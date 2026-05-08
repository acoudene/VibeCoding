import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const PLAYLIST = {
  id: "pl-e2e-wrong",
  name: "E2E wrong",
  tracks: [{ expectedTitle: "T", expectedArtist: "A", youtubeId: "dQw4w9WgXcQ" }],
};

test.describe("Wrong answer blocks player; another can re-buzz", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("after wrong answer, blocked player can't buzz, second player wins", async ({
    browser,
    request,
  }) => {
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-e2e", playlist: PLAYLIST },
    });
    const { code } = (await create.json()) as { code: string };

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();

    await a.goto(`/play/${code}`);
    await a.getByPlaceholder("Ton pseudo").fill("Alice");
    await a.getByRole("button", { name: "Rejoindre" }).click();

    await b.goto(`/play/${code}`);
    await b.getByPlaceholder("Ton pseudo").fill("Bob");
    await b.getByRole("button", { name: "Rejoindre" }).click();

    await request.post(`/api/rooms/${code}/start`, {
      data: { hostId: "host-e2e" },
    });

    await expect(a.getByRole("button", { name: /^Buzz$/ })).toBeEnabled({ timeout: 10_000 });
    await a.getByRole("button", { name: /^Buzz$/ }).click();

    await request.post(`/api/rooms/${code}/validate`, {
      data: { hostId: "host-e2e", outcome: "wrong" },
    });

    // Alice now blocked; her button shows the explanation text.
    await expect(a.getByText("Tu as répondu faux")).toBeVisible({ timeout: 5_000 });

    // Bob can still buzz.
    await b.getByRole("button", { name: /^Buzz$/ }).click();
    await request.post(`/api/rooms/${code}/validate`, {
      data: { hostId: "host-e2e", outcome: "correct" },
    });

    await expect(b.getByText("Fin de la partie")).toBeVisible({ timeout: 10_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
