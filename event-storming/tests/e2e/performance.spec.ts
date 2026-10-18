import { expect, test, type Page } from "@playwright/test";
import * as Y from "yjs";
import { centerOf, createBoardViaApi, openBoard, stickies } from "./helpers";

/** Seuil de fluidité visé (plan 002, « Perf. 300 + 300 ») : signalé, jamais bloquant. */
const FPS_THRESHOLD = 30;
const STICKY_COUNT = 300;
const LINK_COUNT = 300;
const MEASURE_MS = 2000;

/** Types enchaînés dans la grammaire : Command → Aggregate → DomainEvent → Policy → Command. */
const CYCLE = ["Command", "Aggregate", "DomainEvent", "Policy"] as const;

/** Construit directement l'état Yjs (schéma du plan 002) : 300 post-its en grille et 300 liens conformes en chaîne. */
function buildBoardUpdate(): Uint8Array {
  const doc = new Y.Doc();
  const stickyMap = doc.getMap<unknown>("stickies");
  const linkMap = doc.getMap<unknown>("links");
  const ids: string[] = [];
  doc.transact(() => {
    for (let i = 0; i < STICKY_COUNT; i += 1) {
      const id = `perf-sticky-${i}`;
      ids.push(id);
      stickyMap.set(
        id,
        new Y.Map<unknown>([
          ["kind", CYCLE[i % CYCLE.length]],
          ["label", `Post-it ${i}`],
          ["notes", ""],
          ["x", (i % 20) * 220],
          ["y", Math.floor(i / 20) * 220],
        ]),
      );
    }
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const sourceId = ids[i];
      const targetId = ids[(i + 1) % STICKY_COUNT];
      linkMap.set(`perf-link-${i}`, new Y.Map<unknown>([["sourceId", sourceId], ["targetId", targetId]]));
    }
  });
  return Y.encodeStateAsUpdate(doc);
}

/** Images par seconde mesurées par `requestAnimationFrame` pendant que `action` s'exécute. */
async function measureFps(page: Page, action: () => Promise<void>): Promise<number> {
  await page.evaluate(() => {
    const probe = { frames: 0, start: performance.now(), running: true };
    (window as unknown as { __fps: typeof probe }).__fps = probe;
    const tick = () => {
      if (!probe.running) return;
      probe.frames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await action();
  return page.evaluate(() => {
    const probe = (window as unknown as { __fps: { frames: number; start: number; running: boolean } }).__fps;
    probe.running = false;
    return (probe.frames * 1000) / (performance.now() - probe.start);
  });
}

// Mesure non bloquante : étiquetée `@perf`, la CI la lance à part (`--grep @perf`) en tolérant l'échec.
test("300 post-its + 300 liens : fluidité au déplacement et au zoom", { tag: "@perf" }, async ({ page }) => {
  test.setTimeout(120_000);
  const id = await createBoardViaApi(page);
  const seeded = await page.request.post(`/api/boards/${id}/updates`, {
    data: Buffer.from(buildBoardUpdate()),
    headers: { "content-type": "application/octet-stream" },
  });
  expect(seeded.status()).toBe(204);

  const opening = Date.now();
  await openBoard(page, id);
  await expect(page.locator(".react-flow__node-sticky").first()).toBeVisible();
  const openMs = Date.now() - opening;

  // Un post-it visible, près du centre du canevas.
  const canvas = await page.locator(".react-flow").boundingBox();
  expect(canvas).not.toBeNull();
  const centre = { x: canvas!.x + canvas!.width / 2, y: canvas!.y + canvas!.height / 2 };
  const visible = await stickies(page).count();
  let target = stickies(page).first();
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < visible; i += 1) {
    const box = await stickies(page).nth(i).boundingBox();
    if (box === null) continue;
    const distance = Math.hypot(box.x + box.width / 2 - centre.x, box.y + box.height / 2 - centre.y);
    if (distance < best) {
      best = distance;
      target = stickies(page).nth(i);
    }
  }
  const from = await centerOf(target);

  const dragFps = await measureFps(page, async () => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const started = Date.now();
    let step = 0;
    while (Date.now() - started < MEASURE_MS) {
      step += 1;
      await page.mouse.move(from.x + Math.sin(step / 5) * 60, from.y + Math.cos(step / 5) * 40 + step);
    }
    await page.mouse.up();
  });

  await page.mouse.move(centre.x, centre.y);
  const zoomFps = await measureFps(page, async () => {
    const started = Date.now();
    let direction = -1;
    while (Date.now() - started < MEASURE_MS) {
      await page.mouse.wheel(0, direction * 120);
      direction = -direction;
      await page.waitForTimeout(16);
    }
  });

  const report = `[perf] ${STICKY_COUNT} post-its + ${LINK_COUNT} liens : ouverture ${openMs} ms, déplacement ${dragFps.toFixed(1)} i/s, zoom ${zoomFps.toFixed(1)} i/s (seuil ${FPS_THRESHOLD})`;
  // eslint-disable-next-line no-console
  console.log(report);
  test.info().annotations.push({ type: "perf", description: report });
  for (const [gesture, fps] of [["déplacement", dragFps], ["zoom", zoomFps]] as const) {
    if (fps < FPS_THRESHOLD) {
      const warning = `[perf] AVERTISSEMENT : ${gesture} à ${fps.toFixed(1)} i/s, sous le seuil de ${FPS_THRESHOLD} i/s (non bloquant)`;
      console.warn(warning);
      test.info().annotations.push({ type: "perf-warning", description: warning });
    }
  }
});
