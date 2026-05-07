export class EmptyTrackFieldError extends Error {
  constructor(field: "expectedTitle" | "expectedArtist") {
    super(`Track field "${field}" must not be empty`);
    this.name = "EmptyTrackFieldError";
  }
}

export class InvalidYoutubeIdError extends Error {
  constructor(id: string) {
    super(`Invalid YouTube id "${id}" — must match [A-Za-z0-9_-]{11}`);
    this.name = "InvalidYoutubeIdError";
  }
}

export class InvalidStartSecondsError extends Error {
  constructor(value: number) {
    super(`startSeconds must be a finite non-negative number (got ${value})`);
    this.name = "InvalidStartSecondsError";
  }
}

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function assertNonEmpty(value: string, field: "expectedTitle" | "expectedArtist"): void {
  if (value.trim().length === 0) throw new EmptyTrackFieldError(field);
}

function assertValidYoutubeId(id: string): void {
  if (!YOUTUBE_ID_REGEX.test(id)) throw new InvalidYoutubeIdError(id);
}

function assertValidStartSeconds(value: number): void {
  if (!Number.isFinite(value) || value < 0) throw new InvalidStartSecondsError(value);
}

export type TrackProps = {
  expectedTitle: string;
  expectedArtist: string;
  youtubeId: string;
  startSeconds?: number;
};

export class Track {
  readonly expectedTitle: string;
  readonly expectedArtist: string;
  readonly youtubeId: string;
  readonly startSeconds?: number;

  private constructor(
    expectedTitle: string,
    expectedArtist: string,
    youtubeId: string,
    startSeconds?: number,
  ) {
    this.expectedTitle = expectedTitle;
    this.expectedArtist = expectedArtist;
    this.youtubeId = youtubeId;
    this.startSeconds = startSeconds;
  }

  static create(props: TrackProps): Track {
    assertNonEmpty(props.expectedTitle, "expectedTitle");
    assertNonEmpty(props.expectedArtist, "expectedArtist");
    assertValidYoutubeId(props.youtubeId);
    if (props.startSeconds !== undefined) assertValidStartSeconds(props.startSeconds);
    return new Track(
      props.expectedTitle,
      props.expectedArtist,
      props.youtubeId,
      props.startSeconds,
    );
  }
}
