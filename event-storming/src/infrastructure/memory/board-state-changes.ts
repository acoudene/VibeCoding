import type { BoardState } from "../../domain/board/board";
import type { BoardChange } from "../../domain/board/board-change";

/** Reporte une modification du domaine sur un état stocké (équivalent mémoire des transactions Yjs). */
export function applyBoardChange(state: BoardState, change: BoardChange): BoardState {
  switch (change.type) {
    case "BoardRenamed":
      return { ...state, name: change.name };
    case "StickyAdded":
      return { ...state, stickies: [...state.stickies, change.sticky] };
    case "StickyUpdated":
      return { ...state, stickies: state.stickies.map((s) => (s.id === change.sticky.id ? change.sticky : s)) };
    case "StickyRemoved":
      return { ...state, stickies: state.stickies.filter((s) => s.id !== change.stickyId) };
    case "LinkAdded":
      return { ...state, links: [...state.links, change.link] };
    case "LinkReversed":
      return { ...state, links: state.links.map((l) => (l.id === change.link.id ? change.link : l)) };
    case "LinkRemoved":
      return { ...state, links: state.links.filter((l) => l.id !== change.linkId) };
    case "FrameAdded":
      return { ...state, frames: [...state.frames, change.frame] };
    case "FrameUpdated":
      return { ...state, frames: state.frames.map((f) => (f.id === change.frame.id ? change.frame : f)) };
    case "FrameRemoved":
      return { ...state, frames: state.frames.filter((f) => f.id !== change.frameId) };
  }
}
