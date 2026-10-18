import { InMemoryRecentBoards } from "../../../../src/infrastructure/memory/in-memory-recent-boards";
import { describeRecentBoardsContract } from "../recent-boards-contract";

describeRecentBoardsContract("InMemoryRecentBoards", () => new InMemoryRecentBoards());
