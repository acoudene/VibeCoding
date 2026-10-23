import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CopySelection } from "../../../../src/application/board/copy-selection";
import { DeleteSelection } from "../../../../src/application/board/delete-selection";
import { DuplicateSelection } from "../../../../src/application/board/duplicate-selection";
import { EditSticky } from "../../../../src/application/board/edit-sticky";
import { PasteFragment } from "../../../../src/application/board/paste-fragment";
import { Redo } from "../../../../src/application/board/redo";
import { Undo } from "../../../../src/application/board/undo";
import { DUPLICATE_GAP } from "../../../../src/domain/board/board";
import { STICKY_SIZE, stickyCenter } from "../../../../src/domain/board/sticky";
import { stickyKind, type BoardWorld } from "./world";

function boardContent(world: BoardWorld): string {
  const { stickies, links, frames } = world.store.current();
  return JSON.stringify({ stickies, links, frames });
}

/** Copie sélectionnée (unique) et son original, désigné par le même texte. */
function selectedCopyAndOriginals(world: BoardWorld) {
  assert.equal(world.selection.length, 1);
  const [copyId] = world.selection;
  const copy = copyId === undefined ? undefined : world.store.current().sticky(copyId);
  assert.ok(copy);
  const originals = world.store.current().stickies.filter((s) => s.label === copy.label && s.id !== copy.id);
  return { copy, originals };
}

Given("un post-it {string} de type {string}", function (this: BoardWorld, label: string, kind: string) {
  this.placeSticky(label, stickyKind(kind));
});

Given("un lien de {string} vers {string}", function (this: BoardWorld, source: string, target: string) {
  this.linkStickies(source, target);
});

When("je sélectionne {string}", function (this: BoardWorld, label: string) {
  this.selection = [this.stickyNamed(label).id];
});

When("je sélectionne {string} et {string}", function (this: BoardWorld, first: string, second: string) {
  this.selection = [this.stickyNamed(first).id, this.stickyNamed(second).id];
});

When("je supprime la sélection", function (this: BoardWorld) {
  new DeleteSelection(this.store).execute({ stickyIds: this.selection });
  this.selection = [];
});

When("je duplique la sélection", function (this: BoardWorld) {
  this.selection = new DuplicateSelection(this.store, this.ids).execute({ stickyIds: this.selection }).createdIds;
});

When("je copie la sélection", function (this: BoardWorld) {
  this.clipboard = new CopySelection(this.store).execute({ stickyIds: this.selection });
});

When("je colle au pointeur en \\({int}, {int})", function (this: BoardWorld, x: number, y: number) {
  if (this.clipboard === undefined) throw new Error("Le presse-papiers est vide");
  this.pastedIds = new PasteFragment(this.store, this.ids).execute({ fragment: this.clipboard, at: { x, y } }).createdIds;
  this.selection = this.pastedIds;
});

When("je modifie son texte en {string}", function (this: BoardWorld, label: string) {
  new EditSticky(this.store).execute({ id: this.lastSticky.id, label });
});

When("j'annule", function (this: BoardWorld) {
  this.contentBeforeUndo = boardContent(this);
  new Undo(this.history).execute();
});

When("je rétablis", function (this: BoardWorld) {
  new Redo(this.history).execute();
});

Then("le tableau ne contient que {string}", function (this: BoardWorld, label: string) {
  assert.deepEqual(
    this.store.current().stickies.map((s) => s.label),
    [label],
  );
});

Then("le tableau contient {int} post-its {string} de type {string}", function (this: BoardWorld, count: number, label: string, kind: string) {
  const found = this.store.current().stickies.filter((s) => s.label === label && s.kind === kind);
  assert.equal(found.length, count);
});

Then("la copie est juste en dessous de l'original", function (this: BoardWorld) {
  const { copy, originals } = selectedCopyAndOriginals(this);
  const [original] = originals;
  assert.ok(original);
  assert.deepEqual(copy.position, { x: original.position.x, y: original.position.y + STICKY_SIZE.height + DUPLICATE_GAP });
});

Then("la sélection contient uniquement la copie", function (this: BoardWorld) {
  assert.equal(selectedCopyAndOriginals(this).originals.length, 1);
});

Then("les post-its collés sont groupés autour de \\({int}, {int})", function (this: BoardWorld, x: number, y: number) {
  const pasted = this.store.current().stickies.filter((s) => this.pastedIds.includes(s.id));
  assert.equal(pasted.length, this.pastedIds.length);
  const centers = pasted.map(stickyCenter);
  const xs = centers.map((c) => c.x);
  const ys = centers.map((c) => c.y);
  assert.deepEqual({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }, { x, y });
});

Then("le lien collé relie les copies de {string} et {string}", function (this: BoardWorld, source: string, target: string) {
  const board = this.store.current();
  const pasted = board.stickies.filter((s) => this.pastedIds.includes(s.id));
  const sourceCopy = pasted.find((s) => s.label === source);
  const targetCopy = pasted.find((s) => s.label === target);
  assert.ok(sourceCopy && targetCopy);
  assert.ok(board.links.some((l) => l.sourceId === sourceCopy.id && l.targetId === targetCopy.id));
});

Then("le post-it est toujours présent avec un texte vide", function (this: BoardWorld) {
  assert.equal(this.lastSticky.label, "");
});

Then("le post-it a le texte {string}", function (this: BoardWorld, label: string) {
  assert.equal(this.lastSticky.label, label);
});

Then("le tableau est inchangé", function (this: BoardWorld) {
  assert.equal(boardContent(this), this.contentBeforeUndo);
});
