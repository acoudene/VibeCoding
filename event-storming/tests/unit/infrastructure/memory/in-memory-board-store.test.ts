import { InMemoryBoardStore } from "../../../../src/infrastructure/memory/in-memory-board-store";
import { describeBoardStoreContract } from "../board-store-contract";

/** Chaque mise à jour mémoire est un état complet : la dernière suffit à rouvrir le tableau. */
describeBoardStoreContract("InMemoryBoardStore", {
  create: () => new InMemoryBoardStore(),
  encodedStateAfter: (updates) => updates.at(-1) ?? new Uint8Array(),
});
