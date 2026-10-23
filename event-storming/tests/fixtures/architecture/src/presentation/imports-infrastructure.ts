import { now } from "../infrastructure/clock";

export const stamp = (): number => now();
