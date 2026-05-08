import type { Clock } from "@/application/ports/clock";

export class FakeClock implements Clock {
  private current: number;

  constructor(initial = 1_700_000_000_000) {
    this.current = initial;
  }

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(t: number): void {
    this.current = t;
  }
}
