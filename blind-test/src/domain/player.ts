export class EmptyNicknameError extends Error {
  constructor() {
    super("Nickname must not be empty");
    this.name = "EmptyNicknameError";
  }
}

export class NicknameTooLongError extends Error {
  constructor(length: number) {
    super(`Nickname must be at most 20 characters (got ${length})`);
    this.name = "NicknameTooLongError";
  }
}

export class InvalidScoreError extends Error {
  constructor(score: number) {
    super(`Score must be a non-negative half-integer (got ${score})`);
    this.name = "InvalidScoreError";
  }
}

const MAX_NICKNAME_LENGTH = 20;

function assertValidScore(score: number): void {
  if (score < 0 || !Number.isFinite(score) || (score * 2) % 1 !== 0) {
    throw new InvalidScoreError(score);
  }
}

function assertValidNickname(nickname: string): string {
  const trimmed = nickname.trim();
  if (trimmed.length === 0) throw new EmptyNicknameError();
  if (nickname.length > MAX_NICKNAME_LENGTH) throw new NicknameTooLongError(nickname.length);
  return nickname;
}

export type PlayerId = string;

export type PlayerProps = {
  id: PlayerId;
  nickname: string;
  score?: number;
  connected?: boolean;
};

export class Player {
  readonly id: PlayerId;
  readonly nickname: string;
  readonly score: number;
  readonly connected: boolean;

  private constructor(id: PlayerId, nickname: string, score: number, connected: boolean) {
    this.id = id;
    this.nickname = nickname;
    this.score = score;
    this.connected = connected;
  }

  static create(props: PlayerProps): Player {
    const nickname = assertValidNickname(props.nickname);
    const score = props.score ?? 0;
    assertValidScore(score);
    const connected = props.connected ?? true;
    return new Player(props.id, nickname, score, connected);
  }

  addPoints(amount: number): Player {
    assertValidScore(amount);
    return new Player(this.id, this.nickname, this.score + amount, this.connected);
  }

  setScore(score: number): Player {
    assertValidScore(score);
    return new Player(this.id, this.nickname, score, this.connected);
  }

  setConnected(connected: boolean): Player {
    return new Player(this.id, this.nickname, this.score, connected);
  }
}
