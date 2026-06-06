// Génération de codes de salon courts, lisibles (sans caractères ambigus).
import { customAlphabet } from "nanoid";

// Pas de 0/O/1/I/L pour éviter la confusion à l'oral.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const nano = customAlphabet(ALPHABET, 4);

export function generateGameCode(): string {
  return nano();
}
