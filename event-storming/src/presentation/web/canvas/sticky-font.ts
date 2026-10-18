import { STICKY_SIZE } from "../../../domain/board/sticky";

const SMALLEST_FONT_SIZE = 10;
/** Paliers de taille de police (px), du plus grand au plus petit. */
export const STICKY_FONT_SIZES = [22, 18, 15, 12, SMALLEST_FONT_SIZE] as const;

/** Zone de texte du post-it : sa taille moins la marge intérieure (`.sticky-node { padding: 10px }`). */
const TEXT_BOX = { width: STICKY_SIZE.width - 20, height: STICKY_SIZE.height - 20 } as const;
/** Hauteur de ligne (`line-height: 1.2`) et largeur moyenne d'un caractère, en fraction de la taille de police. */
const LINE_HEIGHT = 1.2;
const AVERAGE_CHAR_WIDTH = 0.55;

/**
 * Taille de police qui fait tenir le texte dans un post-it de taille fixe (FR-013) : le plus grand palier dont
 * l'estimation du nombre de lignes affichées (retours à la ligne compris) tient dans la hauteur ; sinon le plus petit.
 */
export function stickyFontSize(label: string): number {
  const lines = label.trim().split("\n");
  const fits = (size: number) => {
    const charsPerLine = Math.max(1, Math.floor(TEXT_BOX.width / (size * AVERAGE_CHAR_WIDTH)));
    const maxLines = Math.floor(TEXT_BOX.height / (size * LINE_HEIGHT));
    const displayedLines = lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
    return displayedLines <= maxLines;
  };
  return STICKY_FONT_SIZES.find(fits) ?? SMALLEST_FONT_SIZE;
}
