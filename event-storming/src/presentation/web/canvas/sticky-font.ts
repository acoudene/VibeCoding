/** Paliers de taille de police (px), du plus grand au plus petit. */
export const STICKY_FONT_SIZES = [22, 18, 15, 12, 10] as const;

/** Longueur maximale (caractères) servie par chaque palier, sauf le dernier qui sert le reste. */
const MAX_LENGTHS = [20, 45, 90, 160] as const;

/** Taille de police qui fait tenir le texte dans un post-it de taille fixe (FR-013) : plus il est long, plus elle est petite. */
export function stickyFontSize(label: string): number {
  const length = label.trim().length;
  const step = MAX_LENGTHS.findIndex((max) => length <= max);
  return STICKY_FONT_SIZES[step === -1 ? STICKY_FONT_SIZES.length - 1 : step] ?? STICKY_FONT_SIZES[0];
}
