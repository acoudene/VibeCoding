import { expect, type Locator, type Page } from "@playwright/test";

/** Crée un tableau par l'API et renvoie son identifiant. */
export async function createBoardViaApi(page: Page): Promise<string> {
  const response = await page.request.post("/api/boards");
  expect(response.status()).toBe(201);
  const { id } = (await response.json()) as { id: string };
  return id;
}

/** Crée un tableau par l'interface (« Nouveau tableau ») et attend l'espace de travail. */
export async function createBoardViaUi(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Nouveau tableau" }).click();
  await page.waitForURL(/\/b\/[A-Za-z0-9_-]{22}$/);
  await expect(page.getByLabel("Nom du tableau")).toBeVisible();
  return boardIdOf(page);
}

export function boardIdOf(page: Page): string {
  const id = new URL(page.url()).pathname.split("/").pop();
  if (id === undefined || id === "") throw new Error("Pas d'identifiant de tableau dans l'URL");
  return id;
}

export async function openBoard(page: Page, id: string): Promise<void> {
  await page.goto(`/b/${id}`);
  await expect(page.getByLabel("Nom du tableau")).toBeVisible();
}

export const pane = (page: Page): Locator => page.locator(".react-flow__pane");
export const stickies = (page: Page): Locator => page.locator(".react-flow__node-sticky");
export const frames = (page: Page): Locator => page.locator(".react-flow__node-frame");
export const links = (page: Page): Locator => page.locator(".react-flow__edge");

export async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("Élément sans boîte");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Pose un post-it du type donné au point de la page (coordonnées écran), saisit son texte et valide par Échap. */
export async function placeSticky(page: Page, kind: string, at: { x: number; y: number }, text: string): Promise<Locator> {
  const before = await stickies(page).count();
  await page.getByRole("button", { name: kind, exact: true }).click();
  await page.mouse.click(at.x, at.y);
  const editor = page.getByLabel("Texte du post-it");
  await expect(editor).toBeFocused();
  await editor.fill(text);
  await page.keyboard.press("Escape");
  await expect(stickies(page)).toHaveCount(before + 1);
  return stickies(page).filter({ hasText: text });
}

/** Attend que l'indicateur affiche « Enregistré » (toutes les modifications sont parties au serveur). */
export async function waitSaved(page: Page): Promise<void> {
  await expect(page.locator(".save-indicator")).toHaveText("Enregistré");
}

/** Glisse le pointeur d'un point à un autre (pas intermédiaires pour déclencher le glissement). */
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}
