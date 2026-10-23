import type { Clock } from "../../application/ports/clock";

/** Horloge de test : l'heure ne change que lorsqu'on la fixe. */
export class FixedClock implements Clock {
  constructor(private instant: Date) {}

  setNow(instant: Date): void {
    this.instant = instant;
  }

  now(): Date {
    return new Date(this.instant);
  }
}
