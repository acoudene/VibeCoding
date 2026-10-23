/**
 * Historique des actions locales sur le tableau ouvert (FR-044) : une étape par `BoardStore.apply`.
 * Annuler ou rétablir modifie le tableau ouvert et notifie `BoardStore.onUpdate`.
 */
export interface BoardHistory {
  /** Sans effet s'il n'y a rien à annuler. */
  undo(): void;
  /** Sans effet s'il n'y a rien à rétablir ; une nouvelle action efface ce qui pouvait être rétabli. */
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
