// Règles de scoring (style Kahoot) — pures, testables, sans dépendance.

export const BASE_POINTS = 1000;

/**
 * Calcule les points d'une bonne réponse.
 * - Une bonne réponse rapporte au minimum la moitié des points de base.
 * - Plus la réponse est rapide, plus le bonus est élevé (jusqu'à la totalité).
 * - Une mauvaise réponse rapporte 0.
 *
 * @param isCorrect  la réponse est-elle correcte
 * @param msToAnswer temps de réponse en millisecondes
 * @param timePerQMs durée totale allouée à la question en millisecondes
 */
export function computePoints(
  isCorrect: boolean,
  msToAnswer: number,
  timePerQMs: number,
): number {
  if (!isCorrect) return 0;
  if (timePerQMs <= 0) return BASE_POINTS;

  const clamped = Math.max(0, Math.min(msToAnswer, timePerQMs));
  const speedRatio = 1 - clamped / timePerQMs; // 1 = instantané, 0 = à la dernière seconde
  const points = BASE_POINTS / 2 + (BASE_POINTS / 2) * speedRatio;
  return Math.round(points);
}
