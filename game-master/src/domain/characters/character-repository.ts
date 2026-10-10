import type { PlayerId, SessionId } from "../session/game-session";
import type { Character } from "./character";

export interface CharacterRepository {
  find(sessionId: SessionId, playerId: PlayerId): Promise<Character | undefined>;
  save(character: Character): Promise<void>;
}
