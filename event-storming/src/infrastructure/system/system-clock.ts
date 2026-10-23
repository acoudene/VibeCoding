import type { Clock } from "../../application/ports/clock";

/** Horloge réelle du système. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
