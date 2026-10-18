export type SelectedElement =
  | { readonly kind: "sticky"; readonly id: string }
  | { readonly kind: "frame"; readonly id: string }
  | { readonly kind: "link"; readonly id: string };

interface Selectable {
  readonly id: string;
  readonly selected?: boolean | undefined;
}

/** Élément dont on affiche le panneau contextuel : l'unique élément sélectionné, sinon aucun. */
export function selectedElement(
  nodes: readonly (Selectable & { readonly type?: string | undefined })[],
  edges: readonly Selectable[],
): SelectedElement | undefined {
  const selected: SelectedElement[] = [];
  for (const node of nodes) {
    if (node.selected !== true) continue;
    if (node.type === "sticky" || node.type === "frame") selected.push({ kind: node.type, id: node.id });
  }
  for (const edge of edges) if (edge.selected === true) selected.push({ kind: "link", id: edge.id });
  return selected.length === 1 ? selected[0] : undefined;
}
