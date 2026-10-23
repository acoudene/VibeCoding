import type { FrameNode } from "./frame-nodes";
import type { StickyNode } from "./sticky-nodes";

/** Nœud xyflow du canevas : un post-it ou un cadre. */
export type BoardNode = StickyNode | FrameNode;

export const isSticky = (node: BoardNode): node is StickyNode => node.type === "sticky";
export const isFrame = (node: BoardNode): node is FrameNode => node.type === "frame";
