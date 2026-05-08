import type { CodeGenerator } from "@/application/ports/code-generator";
import { generateCode, type Rng } from "@/domain/generate-code";

const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0]! / 0x1_0000_0000;
};

export class RandomCodeGenerator implements CodeGenerator {
  constructor(private readonly rng: Rng = cryptoRng) {}

  generate(): string {
    return generateCode(this.rng);
  }
}
