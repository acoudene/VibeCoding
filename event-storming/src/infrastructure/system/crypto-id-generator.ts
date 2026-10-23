import type { IdGenerator } from "../../domain/board/id-generator";

const ID_BYTES = 16;

/** Identifiants de 128 bits aléatoires (`crypto.getRandomValues`), en base64url sans padding. */
export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(ID_BYTES));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }
}
