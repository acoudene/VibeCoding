import type { BoardChange } from "../../domain/board-change";

export const removal = (stickyId: string): BoardChange => ({ type: "StickyRemoved", stickyId });
