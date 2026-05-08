import type { CodeGenerator } from "@/application/ports/code-generator";

export class FakeCodeGenerator implements CodeGenerator {
  private readonly queue: string[];
  private fallback: string;

  constructor(queue: string[] = [], fallback = "ABCDEF") {
    this.queue = [...queue];
    this.fallback = fallback;
  }

  generate(): string {
    return this.queue.shift() ?? this.fallback;
  }

  push(code: string): void {
    this.queue.push(code);
  }
}
