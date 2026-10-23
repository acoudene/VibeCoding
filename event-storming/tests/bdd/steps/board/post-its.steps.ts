import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { DeleteSelection } from "../../../../src/application/board/delete-selection";
import { EditSticky } from "../../../../src/application/board/edit-sticky";
import { MoveSticky } from "../../../../src/application/board/move-sticky";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { STICKY_SIZE } from "../../../../src/domain/board/sticky";
import { stickyColor, type StickyColor } from "../../../../src/domain/board/sticky-kind";
import { stickyKind, type BoardWorld } from "./world";

const COLORS_FR: Readonly<Record<string, StickyColor>> = {
  orange: "orange",
  bleu: "blue",
  "jaune pâle": "paleYellow",
  jaune: "yellow",
  violet: "purple",
  vert: "green",
  rose: "pink",
  rouge: "red",
  gris: "grey",
};

function colorNamed(name: string): StickyColor {
  const color = COLORS_FR[name];
  if (color === undefined) throw new Error(`Couleur inconnue : ${name}`);
  return color;
}

Given("le type actif {string}", function (this: BoardWorld, kind: string) {
  this.activeKind = stickyKind(kind);
});

Given("un tableau avec un post-it {string} de type {string}", async function (this: BoardWorld, label: string, kind: string) {
  await this.createAndOpenBoard();
  this.placeSticky(label, stickyKind(kind));
});

Given(
  "un tableau avec un post-it {string} de type {string} en \\({int}, {int})",
  async function (this: BoardWorld, label: string, kind: string, x: number, y: number) {
    await this.createAndOpenBoard();
    this.placeSticky(label, stickyKind(kind), { x, y });
  },
);

Given(
  "un tableau avec un post-it {string} de type {string} et un post-it {string} de type {string}",
  async function (this: BoardWorld, first: string, firstKind: string, second: string, secondKind: string) {
    await this.createAndOpenBoard();
    this.placeSticky(first, stickyKind(firstKind));
    this.placeSticky(second, stickyKind(secondKind));
  },
);

When("je pose un post-it en \\({int}, {int})", function (this: BoardWorld, x: number, y: number) {
  this.lastStickyId = new PlaceSticky(this.store, this.ids).execute({ kind: this.activeKind, position: { x, y } }).id;
});

When("je pose un post-it de type {string}", function (this: BoardWorld, kind: string) {
  this.lastStickyId = new PlaceSticky(this.store, this.ids).execute({ kind: stickyKind(kind), position: { x: 0, y: 0 } }).id;
});

When(
  "je modifie son texte en {string}, son identifiant en {string} et ses notes en {string}",
  function (this: BoardWorld, label: string, identifier: string, notes: string) {
    new EditSticky(this.store).execute({ id: this.lastSticky.id, label, identifier, notes });
  },
);

When("je change le type de {string} en {string}", function (this: BoardWorld, label: string, kind: string) {
  new EditSticky(this.store).execute({ id: this.stickyNamed(label).id, kind: stickyKind(kind) });
});

When("je déplace {string} en \\({int}, {int})", function (this: BoardWorld, label: string, x: number, y: number) {
  new MoveSticky(this.store).execute({ id: this.stickyNamed(label).id, to: { x, y } });
});

When("je supprime le post-it {string}", function (this: BoardWorld, label: string) {
  new DeleteSelection(this.store).execute({ stickyIds: [this.stickyNamed(label).id] });
});

Then(
  "le tableau contient {int} post-it de type {string} en \\({int}, {int})",
  function (this: BoardWorld, count: number, kind: string, x: number, y: number) {
    const found = this.store.current().stickies.filter((s) => s.kind === kind && s.position.x === x && s.position.y === y);
    assert.equal(found.length, count);
    assert.equal(this.store.current().stickies.length, count);
  },
);

Then("ce post-it est {}", function (this: BoardWorld, colorName: string) {
  assert.equal(stickyColor(this.lastSticky.kind), colorNamed(colorName));
});

Then("son texte est vide", function (this: BoardWorld) {
  assert.equal(this.lastSticky.label, "");
});

// La taille est fixe (FR-017) : elle ne fait pas partie de l'état d'un post-it, seulement du domaine.
Then("les deux post-its ont la même taille", function (this: BoardWorld) {
  assert.equal(this.store.current().stickies.length, 2);
  assert.deepEqual(STICKY_SIZE, { width: 160, height: 160 });
});

Then(
  "le post-it a le texte {string}, l'identifiant {string} et les notes {string}",
  function (this: BoardWorld, label: string, identifier: string, notes: string) {
    const { label: actualLabel, identifier: actualIdentifier, notes: actualNotes } = this.lastSticky;
    assert.deepEqual([actualLabel, actualIdentifier, actualNotes], [label, identifier, notes]);
  },
);

Then("{string} est en \\({int}, {int})", function (this: BoardWorld, label: string, x: number, y: number) {
  assert.deepEqual(this.stickyNamed(label).position, { x, y });
});

Then("le tableau ne contient plus {string}", function (this: BoardWorld, label: string) {
  assert.equal(
    this.store.current().stickies.some((s) => s.label === label),
    false,
  );
});
