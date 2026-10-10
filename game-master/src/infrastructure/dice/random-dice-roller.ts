import type { DiceRoller } from "../../domain/rules/dice-roller";

export class RandomDiceRoller implements DiceRoller {
  roll(sides: number): number {
    return 1 + Math.floor(Math.random() * sides);
  }
}
