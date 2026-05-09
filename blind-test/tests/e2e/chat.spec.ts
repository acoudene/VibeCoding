import { expect, test } from "@playwright/test";

const HAS_PUSHER = !!(process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY);

const PLAYLIST = {
  id: "pl-chat",
  name: "Chat playlist",
  tracks: [
    { expectedTitle: "Track A", expectedArtist: "Artist A", youtubeId: "dQw4w9WgXcQ" },
  ],
};

test.describe("Chat: messages, history on join, host can close", () => {
  test.skip(!HAS_PUSHER, "Skipped: Pusher/soketi env vars not configured");

  test("Alice posts, Bob joining later sees the history; host closes; Bob is locked out", async ({
    browser,
    request,
  }) => {
    const create = await request.post("/api/rooms", {
      data: { hostId: "host-chat", playlist: PLAYLIST },
    });
    expect(create.ok()).toBe(true);
    const { code } = (await create.json()) as { code: string };

    const aliceCtx = await browser.newContext();
    const alice = await aliceCtx.newPage();
    await alice.goto(`/play/${code}`);
    await alice.getByPlaceholder("Ton pseudo").fill("Alice");
    await alice.getByRole("button", { name: "Rejoindre" }).click();
    await expect(alice.getByText("L'hôte va démarrer la partie…")).toBeVisible();

    // Alice posts a message.
    const aliceChat = alice.getByRole("textbox", { name: "Message du tchat" });
    await aliceChat.fill("Hello from Alice");
    await alice.getByRole("button", { name: "Envoyer" }).click();
    await expect(alice.getByText("Hello from Alice")).toBeVisible();

    // Bob joins and should see Alice's history.
    const bobCtx = await browser.newContext();
    const bob = await bobCtx.newPage();
    await bob.goto(`/play/${code}`);
    await bob.getByPlaceholder("Ton pseudo").fill("Bob");
    await bob.getByRole("button", { name: "Rejoindre" }).click();
    await expect(bob.getByText("Hello from Alice")).toBeVisible({ timeout: 10_000 });

    // Host closes the chat via API.
    const toggle = await request.post(`/api/rooms/${code}/chat-toggle`, {
      data: { hostId: "host-chat" },
    });
    expect(toggle.ok()).toBe(true);

    // Bob's textarea should now be disabled.
    await expect(bob.getByRole("textbox", { name: "Message du tchat" })).toBeDisabled({
      timeout: 5_000,
    });
  });
});
