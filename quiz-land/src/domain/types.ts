// Types partagés du domaine (côté client et serveur).
// Indépendants de Prisma : ce sont les contrats échangés via l'API et Pusher.

export type GameState = "LOBBY" | "QUESTION" | "REVEAL" | "FINISHED";

export type QuestionMode = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FREE_TEXT";

export interface PublicPlayer {
  id: string;
  userId: string;
  nickname: string;
  score: number;
}

// Question telle qu'envoyée aux joueurs PENDANT le jeu : sans la bonne réponse (anti-triche).
export interface PublicQuestion {
  roundId: string;
  index: number;
  total: number;
  mode: QuestionMode;
  categoryName: string;
  categoryEmoji?: string;
  text: string;
  choices: string[];
  timePerQ: number;
  startedAt: number; // epoch ms, pour caler le timer côté client
}

// Révélation : la bonne réponse + le classement courant.
export interface Reveal {
  roundId: string;
  correctIndex: number | null;
  correctText: string | null;
  explanation?: string | null;
  // Décompte des réponses par choix (pour l'écran hôte).
  distribution: number[];
  leaderboard: PublicPlayer[];
}

export interface GameSnapshot {
  code: string;
  state: GameState;
  hostUserId: string;
  categorySlug: string | null;
  questionCount: number;
  timePerQ: number;
  currentIndex: number;
  players: PublicPlayer[];
  question?: PublicQuestion;
  reveal?: Reveal;
}

export interface CategoryInfo {
  slug: string;
  name: string;
  emoji?: string;
  questionCount?: number;
}
