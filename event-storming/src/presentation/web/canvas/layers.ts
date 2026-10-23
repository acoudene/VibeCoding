/**
 * Ordre d'empilement du canevas (`zIndexMode="manual"`) : les cadres sous les liens, les liens sous les post-its.
 * Les cadres sont des nœuds ordinaires, sans groupe xyflow (`parentId`) : l'appartenance reste calculée par le domaine.
 */
export const FRAME_Z_INDEX = 0;
export const LINK_Z_INDEX = 1;
export const STICKY_Z_INDEX = 2;
