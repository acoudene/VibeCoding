import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DebouncedSave } from "../../../../../src/presentation/web/hooks/debounced-save";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const saved: number[] = [];
  return { saved, saver: new DebouncedSave<number>(300, (value) => saved.push(value)) };
}

describe("DebouncedSave", () => {
  it("n'enregistre que la dernière valeur, après le délai d'inactivité", () => {
    const { saved, saver } = setup();
    saver.schedule(1);
    vi.advanceTimersByTime(200);
    saver.schedule(2);
    vi.advanceTimersByTime(299);
    expect(saved).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(saved).toEqual([2]);
  });

  it("flush enregistre tout de suite la valeur en attente, une seule fois", () => {
    const { saved, saver } = setup();
    saver.schedule(1);
    saver.flush();
    expect(saved).toEqual([1]);
    vi.advanceTimersByTime(1000);
    saver.flush();
    expect(saved).toEqual([1]);
  });

  it("flush sans rien en attente n'enregistre rien", () => {
    const { saved, saver } = setup();
    saver.flush();
    expect(saved).toEqual([]);
  });
});
