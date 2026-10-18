import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { DrawFrame } from "../../../../src/application/board/draw-frame";
import { EditFrame } from "../../../../src/application/board/edit-frame";
import { frameOf, type Frame } from "../../../../src/domain/board/frame";
import type { Rect } from "../../../../src/domain/board/geometry";
import { stickyCenter } from "../../../../src/domain/board/sticky";
import { stickyKind, type BoardWorld } from "./world";

/** Rectangle décrit par deux coins opposés « de (x1, y1) à (x2, y2) ». */
function corners(x1: number, y1: number, x2: number, y2: number): Rect {
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function frameNamed(world: BoardWorld, name: string): Frame {
  const frame = world.store.current().frames.find((f) => f.name === name);
  if (frame === undefined) throw new Error(`Aucun cadre « ${name} » sur le tableau`);
  return frame;
}

function drawFrame(world: BoardWorld, rect: Rect, name?: string): void {
  const { id } = new DrawFrame(world.store, world.ids).execute({ rect });
  if (name !== undefined) new EditFrame(world.store).execute({ frameId: id, action: "rename", name });
}

function frameOfSticky(world: BoardWorld, label: string): Frame | undefined {
  return frameOf(stickyCenter(world.stickyNamed(label)), world.store.current().frames);
}

Given(
  "un tableau avec un cadre {string} de \\({int}, {int}) à \\({int}, {int})",
  async function (this: BoardWorld, name: string, x1: number, y1: number, x2: number, y2: number) {
    await this.createAndOpenBoard();
    drawFrame(this, corners(x1, y1, x2, y2), name);
  },
);

Given(
  "un cadre {string} de \\({int}, {int}) à \\({int}, {int})",
  function (this: BoardWorld, name: string, x1: number, y1: number, x2: number, y2: number) {
    drawFrame(this, corners(x1, y1, x2, y2), name);
  },
);

Given(
  "un post-it {string} de type {string} centré en \\({int}, {int})",
  function (this: BoardWorld, label: string, kind: string, x: number, y: number) {
    this.placeStickyCentered(label, stickyKind(kind), { x, y });
  },
);

When("je dessine un cadre de \\({int}, {int}) à \\({int}, {int})", function (this: BoardWorld, x1: number, y1: number, x2: number, y2: number) {
  drawFrame(this, corners(x1, y1, x2, y2));
});

When("je déplace le cadre {string} de \\({int}, {int})", function (this: BoardWorld, name: string, dx: number, dy: number) {
  new EditFrame(this.store).execute({ frameId: frameNamed(this, name).id, action: "move", dx, dy });
});

When("je renomme le cadre {string} en {string}", function (this: BoardWorld, name: string, newName: string) {
  new EditFrame(this.store).execute({ frameId: frameNamed(this, name).id, action: "rename", name: newName });
});

When(
  "je redimensionne le cadre {string} de \\({int}, {int}) à \\({int}, {int})",
  function (this: BoardWorld, name: string, x1: number, y1: number, x2: number, y2: number) {
    new EditFrame(this.store).execute({ frameId: frameNamed(this, name).id, action: "resize", rect: corners(x1, y1, x2, y2) });
  },
);

When("je supprime le cadre {string}", function (this: BoardWorld, name: string) {
  new EditFrame(this.store).execute({ frameId: frameNamed(this, name).id, action: "remove" });
});

Then("les cadres s'appellent {string} et {string}", function (this: BoardWorld, first: string, second: string) {
  assert.deepEqual(
    this.store.current().frames.map((f) => f.name),
    [first, second],
  );
});

Then("{string} appartient au cadre {string}", function (this: BoardWorld, label: string, name: string) {
  assert.equal(frameOfSticky(this, label)?.name, name);
});

Then("{string} n'appartient à aucun cadre", function (this: BoardWorld, label: string) {
  assert.equal(frameOfSticky(this, label), undefined);
});

Then(
  "le cadre {string} va de \\({int}, {int}) à \\({int}, {int})",
  function (this: BoardWorld, name: string, x1: number, y1: number, x2: number, y2: number) {
    assert.deepEqual(frameNamed(this, name).rect, corners(x1, y1, x2, y2));
  },
);

Then("{string} est centré en \\({int}, {int})", function (this: BoardWorld, label: string, x: number, y: number) {
  assert.deepEqual(stickyCenter(this.stickyNamed(label)), { x, y });
});

Then("le tableau contient un cadre {string}", function (this: BoardWorld, name: string) {
  frameNamed(this, name);
});

Then("le tableau ne contient aucun cadre", function (this: BoardWorld) {
  assert.deepEqual(this.store.current().frames, []);
});
