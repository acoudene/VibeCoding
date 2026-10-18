import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { EditLink } from "../../../../src/application/board/edit-link";
import { describeExpectedLinks } from "../../../../src/domain/board/grammar";
import type { Link } from "../../../../src/domain/board/link";
import { stickyKind, type BoardWorld } from "./world";

/** Lien du tableau entre deux post-its désignés par leur texte. */
function linkBetween(world: BoardWorld, sourceLabel: string, targetLabel: string): Link {
  const board = world.store.current();
  const sourceId = world.stickyNamed(sourceLabel).id;
  const targetId = world.stickyNamed(targetLabel).id;
  const link = board.links.find((l) => l.sourceId === sourceId && l.targetId === targetId);
  if (link === undefined) throw new Error(`Aucun lien de « ${sourceLabel} » vers « ${targetLabel} »`);
  return link;
}

function lastLink(world: BoardWorld): Link {
  const link = world.lastLinkId === undefined ? undefined : world.store.current().link(world.lastLinkId);
  if (link === undefined) throw new Error("Aucun lien créé dans ce scénario");
  return link;
}

Given(
  "un tableau avec un lien de {string} \\({word}) vers {string} \\({word})",
  async function (this: BoardWorld, source: string, sourceKind: string, target: string, targetKind: string) {
    await this.createAndOpenBoard();
    this.placeSticky(source, stickyKind(sourceKind));
    this.placeSticky(target, stickyKind(targetKind));
    this.linkStickies(source, target);
  },
);

Given("ce lien respecte la grammaire", function (this: BoardWorld) {
  assert.equal(this.store.current().isOutOfGrammar(lastLink(this)), false);
});

When("je relie {string} à {string}", async function (this: BoardWorld, source: string, target: string) {
  await this.attempt(() => this.linkStickies(source, target));
});

When("j'inverse ce lien", function (this: BoardWorld) {
  new EditLink(this.store).execute({ linkId: lastLink(this).id, action: "reverse" });
});

When("je supprime ce lien", function (this: BoardWorld) {
  new EditLink(this.store).execute({ linkId: lastLink(this).id, action: "remove" });
});

Then("le lien de {string} vers {string} respecte la grammaire", function (this: BoardWorld, source: string, target: string) {
  assert.equal(this.store.current().isOutOfGrammar(linkBetween(this, source, target)), false);
});

Then("le lien de {string} vers {string} est hors grammaire", function (this: BoardWorld, source: string, target: string) {
  assert.equal(this.store.current().isOutOfGrammar(linkBetween(this, source, target)), true);
});

Then("ce lien est hors grammaire", function (this: BoardWorld) {
  assert.equal(this.store.current().isOutOfGrammar(lastLink(this)), true);
});

Then("la règle attendue citée est {string}", function (this: BoardWorld, rule: string) {
  const source = this.store.current().sticky(lastLink(this).sourceId);
  assert.ok(source);
  assert.equal(describeExpectedLinks(source.kind), rule);
});

Then("le tableau contient un lien de {string} vers {string}", function (this: BoardWorld, source: string, target: string) {
  linkBetween(this, source, target);
});

Then("le tableau ne contient aucun lien", function (this: BoardWorld) {
  assert.deepEqual(this.store.current().links, []);
});

Then("le tableau contient {int} post-its", function (this: BoardWorld, count: number) {
  assert.equal(this.store.current().stickies.length, count);
});
