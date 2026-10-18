import { Given, Then, When, type DataTable } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { ForgetRecentBoard } from "../../../../src/application/recent-boards/forget";
import { ListRecentBoards } from "../../../../src/application/recent-boards/list";
import { RenameBoard } from "../../../../src/application/board/rename-board";
import type { BoardWorld } from "./world";

Given("le prochain identifiant généré est {string}", function (this: BoardWorld, id: string) {
  this.ids.enqueue(id);
});

Given("un tableau vide", async function (this: BoardWorld) {
  await this.createAndOpenBoard();
});

Given("il est {string} et que j'ouvre le tableau {string}", async function (this: BoardWorld, now: string, name: string) {
  this.clock.setNow(new Date(now));
  await this.openBoard(await this.boardNamed(name));
});

Given("j'ai ouvert le tableau {string}", async function (this: BoardWorld, name: string) {
  await this.openBoard(await this.boardNamed(name));
});

When("je crée un tableau", async function (this: BoardWorld) {
  await this.createAndOpenBoard();
});

When("j'ouvre le tableau {string}", async function (this: BoardWorld, nameOrId: string) {
  await this.attempt(() => this.openBoard(this.boardRef(nameOrId)));
});

When("je renomme le tableau en {string}", async function (this: BoardWorld, name: string) {
  await this.attempt(() => new RenameBoard(this.store).execute({ name }));
});

When("je retire {string} des tableaux récents", function (this: BoardWorld, name: string) {
  new ForgetRecentBoard(this.recentBoards).execute({ id: this.boardRef(name) });
});

Then("le tableau {string} existe", async function (this: BoardWorld, nameOrId: string) {
  await this.gateway.open(this.boardRef(nameOrId));
});

Then("le tableau {string} existe toujours", async function (this: BoardWorld, nameOrId: string) {
  await this.gateway.open(this.boardRef(nameOrId));
});

Then("son nom est {string}", function (this: BoardWorld, name: string) {
  assert.equal(this.store.current().name, name);
});

Then("il ne contient aucun post-it, aucun lien et aucun cadre", function (this: BoardWorld) {
  const board = this.store.current();
  assert.deepEqual([board.stickies, board.links, board.frames], [[], [], []]);
});

Then("j'obtiens l'erreur {string}", function (this: BoardWorld, message: string) {
  assert.equal(this.takeError().message, message);
});

Then("les tableaux récents sont, dans l'ordre :", function (this: BoardWorld, table: DataTable) {
  const names = new ListRecentBoards(this.recentBoards).execute().map((b) => b.name);
  assert.deepEqual(names, table.hashes().map((row) => row["nom"]));
});

Then("les tableaux récents sont vides", function (this: BoardWorld) {
  assert.deepEqual(new ListRecentBoards(this.recentBoards).execute(), []);
});
