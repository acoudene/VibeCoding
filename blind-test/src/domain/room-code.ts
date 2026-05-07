export class InvalidRoomCodeError extends Error {
  constructor(value: string) {
    super(`Invalid room code "${value}"`);
    this.name = "InvalidRoomCodeError";
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_REGEX = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export const RoomCode = {
  ALPHABET,
  LENGTH: CODE_LENGTH,

  isValid(value: string): boolean {
    if (typeof value !== "string") return false;
    return CODE_REGEX.test(value.toUpperCase());
  },

  normalize(value: string): string {
    const upper = typeof value === "string" ? value.toUpperCase() : "";
    if (!CODE_REGEX.test(upper)) throw new InvalidRoomCodeError(value);
    return upper;
  },
} as const;
