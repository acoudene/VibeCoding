export type SessionId = string;
export type PlayerId = string;

export interface Turn {
  readonly number: number;
  readonly playerId: PlayerId;
  readonly action: string;
  readonly narration: string;
}

/** Agrégat racine : une partie multijoueur. Les invariants sont protégés ici. */
export class GameSession {
  private readonly _turns: Turn[] = [];

  constructor(
    readonly id: SessionId,
    readonly players: readonly PlayerId[],
  ) {
    if (players.length === 0) throw new Error("A session needs at least one player");
  }

  get turns(): readonly Turn[] {
    return this._turns;
  }

  recordTurn(playerId: PlayerId, action: string, narration: string): Turn {
    if (!this.players.includes(playerId)) throw new Error(`Player ${playerId} is not in session ${this.id}`);
    if (action.trim() === "") throw new Error("Action must not be empty");
    const turn: Turn = { number: this._turns.length + 1, playerId, action, narration };
    this._turns.push(turn);
    return turn;
  }
}
