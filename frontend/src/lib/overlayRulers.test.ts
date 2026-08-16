import { describe, expect, it } from "vitest";
import { pickRulerStep } from "./overlayRulers";

describe("pickRulerStep", () => {
  it("picks a small step at high zoom", () => {
    expect(pickRulerStep(3)).toBe(20);
  });

  it("picks a larger step at low zoom", () => {
    expect(pickRulerStep(0.1)).toBe(500);
  });

  it("picks 100 at typical fit-to-window scale (~0.5)", () => {
    expect(pickRulerStep(0.5)).toBe(100);
  });

  it("falls back to the largest step when scale is extremely small", () => {
    expect(pickRulerStep(0.001)).toBe(5000);
  });

  it("always returns a step whose screen-space size is at least 50px", () => {
    for (const scale of [0.05, 0.1, 0.25, 0.5, 1, 2, 4]) {
      const step = pickRulerStep(scale);
      expect(step * scale).toBeGreaterThanOrEqual(50 - 1e-9);
    }
  });
});
