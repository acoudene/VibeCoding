/** Décision du moteur de filtrage. */
export type DecisionKind = "ALLOW" | "BLOCK";

/** Action à appliquer à l'appel. */
export type Action = "RING" | "VOICEMAIL";

/** Un préfixe interdit (liste noire). */
export interface Prefix {
  id: string;
  value: string; // E.164 normalisé, ex "+33899"
  label?: string | null;
  createdAt?: Date;
}

/** Résultat de l'évaluation d'un numéro. */
export interface Decision {
  decision: DecisionKind;
  action: Action;
  spam: boolean;
  /** Préfixe ayant déclenché le blocage (null si ALLOW). */
  matchedPrefix: string | null;
  /** Numéro normalisé en E.164, ou null si l'entrée est invalide. */
  normalized: string | null;
}

/** Trace persistée d'une évaluation d'appel. */
export interface CallLog {
  id: string;
  rawNumber: string;
  normalized: string | null;
  decision: DecisionKind;
  action: Action;
  matchedPrefix: string | null;
  spam: boolean;
  createdAt: Date;
}
