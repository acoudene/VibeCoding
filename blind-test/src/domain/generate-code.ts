import { RoomCode } from "./room-code";

export type Rng = () => number;

export function generateCode(rng: Rng): string {
  const alphabet = RoomCode.ALPHABET;
  let out = "";
  for (let i = 0; i < RoomCode.LENGTH; i++) {
    const raw = rng();
    const clamped = raw >= 1 ? alphabet.length - 1 : Math.max(0, Math.floor(raw * alphabet.length));
    out += alphabet[clamped];
  }
  return out;
}
