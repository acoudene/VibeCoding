import type { BoardName } from "./board-name";
import type { Frame } from "./frame";
import type { Link } from "./link";
import type { Sticky } from "./sticky";

/**
 * Modification élémentaire du tableau : unité appliquée au stockage et à l'historique.
 * Added/Updated/Reversed portent l'élément complet après modification ; Removed porte l'identifiant.
 */
export type BoardChange =
  | { readonly type: "StickyAdded"; readonly sticky: Sticky }
  | { readonly type: "StickyUpdated"; readonly sticky: Sticky }
  | { readonly type: "StickyRemoved"; readonly stickyId: string }
  | { readonly type: "LinkAdded"; readonly link: Link }
  | { readonly type: "LinkReversed"; readonly link: Link }
  | { readonly type: "LinkRemoved"; readonly linkId: string }
  | { readonly type: "FrameAdded"; readonly frame: Frame }
  | { readonly type: "FrameUpdated"; readonly frame: Frame }
  | { readonly type: "FrameRemoved"; readonly frameId: string }
  | { readonly type: "BoardRenamed"; readonly name: BoardName };
