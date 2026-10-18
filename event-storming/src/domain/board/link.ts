/**
 * Relation orientée entre deux post-its du même tableau.
 * `outOfGrammar` n'est pas stocké : il est dérivé des types des extrémités (`Board.isOutOfGrammar`).
 */
export interface Link {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
}
