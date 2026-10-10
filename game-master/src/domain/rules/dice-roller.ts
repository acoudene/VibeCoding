/** Port du domaine : source d'aléatoire. L'implémentation vit en infrastructure. */
export interface DiceRoller {
  /** Retourne un entier dans [1, sides]. */
  roll(sides: number): number;
}
