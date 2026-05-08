export const MATCH_DISTANCE_THRESHOLD = 2;

export type MatchOutcome = "correct" | "half" | "wrong";

export interface SubmittedAnswer {
  title?: string;
  artist?: string;
}

export interface ExpectedAnswer {
  expectedTitle: string;
  expectedArtist?: string;
}

export interface MatchResult {
  titleOk: boolean;
  artistOk: boolean;
  outcome: MatchOutcome;
}

function fieldMatches(submitted: string | undefined, expected: string | undefined): boolean {
  if (expected === undefined || expected === "") return true;
  if (submitted === undefined || submitted === "") return false;
  const a = normalize(submitted);
  const b = normalize(expected);
  if (a === "" || b === "") return false;
  return levenshtein(a, b) <= MATCH_DISTANCE_THRESHOLD;
}

export function matchAnswer(
  submission: SubmittedAnswer,
  expected: ExpectedAnswer,
): MatchResult {
  const titleOk = fieldMatches(submission.title, expected.expectedTitle);
  const hasExpectedArtist = expected.expectedArtist !== undefined && expected.expectedArtist !== "";

  if (!hasExpectedArtist) {
    const outcome: MatchOutcome = titleOk ? "correct" : "wrong";
    return { titleOk, artistOk: titleOk, outcome };
  }

  const artistOk = fieldMatches(submission.artist, expected.expectedArtist);
  let outcome: MatchOutcome;
  if (titleOk && artistOk) outcome = "correct";
  else if (titleOk || artistOk) outcome = "half";
  else outcome = "wrong";

  return { titleOk, artistOk, outcome };
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost,
      );
    }
    prev = [...curr];
  }

  return prev[b.length]!;
}

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
