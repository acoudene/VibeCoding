import { afterEach, describe, expect, it, vi } from "vitest";

import { SystemClock } from "@/infrastructure/time/system-clock";

afterEach(() => {
  vi.useRealTimers();
});

describe("SystemClock", () => {
  it("returns Date.now()", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T10:00:00Z"));
    const clock = new SystemClock();
    expect(clock.now()).toBe(Date.parse("2026-05-08T10:00:00Z"));
  });

  it("advances when system time advances", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const clock = new SystemClock();
    expect(clock.now()).toBe(0);
    vi.advanceTimersByTime(1234);
    expect(clock.now()).toBe(1234);
  });
});
