import { describe, expect, it } from "vitest";
import { EditLink } from "../../../../src/application/board/edit-link";
import { LinkStickies } from "../../../../src/application/board/link-stickies";
import { PlaceSticky } from "../../../../src/application/board/place-sticky";
import { boardId } from "../../../../src/domain/board/board";
import { SelfLinkError } from "../../../../src/domain/board/errors";
import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { ScriptedIdGenerator } from "../../../../src/infrastructure/memory/scripted-id-generator";

function setup() {
  const store = new InMemoryBoardStore();
  store.load(boardId("b-1"), new Uint8Array());
  const ids = new ScriptedIdGenerator();
  const place = new PlaceSticky(store, ids);
  return {
    store,
    link: new LinkStickies(store, ids),
    command: place.execute({ kind: "Command", position: { x: 0, y: 0 } }).id,
    event: place.execute({ kind: "DomainEvent", position: { x: 300, y: 0 } }).id,
    aggregate: place.execute({ kind: "Aggregate", position: { x: 600, y: 0 } }).id,
  };
}

describe("LinkStickies", () => {
  it("crée un lien hors grammaire et le signale", () => {
    const { store, command, event, link } = setup();
    const result = link.execute({ sourceId: event, targetId: command });
    expect(result.outOfGrammar).toBe(true);
    expect(store.current().link(result.id)).toEqual({ id: result.id, sourceId: event, targetId: command });
  });

  it("ne signale pas un lien conforme", () => {
    const { command, aggregate, link } = setup();
    expect(link.execute({ sourceId: command, targetId: aggregate }).outOfGrammar).toBe(false);
  });

  it("refuse de relier un post-it à lui-même", () => {
    const { command, link } = setup();
    expect(() => link.execute({ sourceId: command, targetId: command })).toThrow(SelfLinkError);
  });
});

describe("EditLink", () => {
  it("inverse un lien", () => {
    const { store, command, event, link } = setup();
    const { id } = link.execute({ sourceId: event, targetId: command });
    new EditLink(store).execute({ linkId: id, action: "reverse" });
    expect(store.current().link(id)).toEqual({ id, sourceId: command, targetId: event });
  });

  it("supprime un lien en conservant les post-its", () => {
    const { store, command, event, link } = setup();
    const { id } = link.execute({ sourceId: event, targetId: command });
    new EditLink(store).execute({ linkId: id, action: "remove" });
    expect([store.current().links.length, store.current().stickies.length]).toEqual([0, 3]);
  });
});
