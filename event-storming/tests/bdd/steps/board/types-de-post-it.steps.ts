import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { type StickyKind, stickyColor } from "../../../../src/domain/board/sticky-kind";

interface StickyWorld {
  kind?: StickyKind;
}

Given("un post-it de type {string}", function (this: StickyWorld, kind: StickyKind) {
  this.kind = kind;
});

Then("sa couleur est {string}", function (this: StickyWorld, color: string) {
  assert.ok(this.kind);
  assert.equal(stickyColor(this.kind), color);
});
