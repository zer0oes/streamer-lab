import { describe, expect, it } from "vitest";
import {
  canvasPointFromEvent,
  clampOverlayZoom,
  computeOverlayFitScale,
  overlayCanvasScale,
  overlayGuidesWithCenter,
  pickRulerStep,
  snapEdge,
  snapMovePosition,
  stepOverlayZoom
} from "./overlayGeometry";

describe("computeOverlayFitScale", () => {
  it("fits to width when width is the limiting dimension", () => {
    const scale = computeOverlayFitScale(
      { width: 1920, height: 1080 },
      { wrapClientWidth: 960, wrapTop: 0, windowInnerHeight: 2000, showGuides: false }
    );
    expect(scale).toBeCloseTo(0.5);
  });

  it("never exceeds 100%", () => {
    const scale = computeOverlayFitScale(
      { width: 1920, height: 1080 },
      { wrapClientWidth: 4000, wrapTop: 0, windowInnerHeight: 4000, showGuides: false }
    );
    expect(scale).toBe(1);
  });

  it("reserves ruler space on both axes when guides are shown", () => {
    const withoutGuides = computeOverlayFitScale(
      { width: 1000, height: 1000 },
      { wrapClientWidth: 1000, wrapTop: 0, windowInnerHeight: 2000, showGuides: false }
    );
    const withGuides = computeOverlayFitScale(
      { width: 1000, height: 1000 },
      { wrapClientWidth: 1000, wrapTop: 0, windowInnerHeight: 2000, showGuides: true }
    );
    expect(withGuides).toBeLessThan(withoutGuides);
  });

  it("clamps available height to at least 120px", () => {
    const scale = computeOverlayFitScale(
      { width: 100, height: 1000 },
      { wrapClientWidth: 1000, wrapTop: 1900, windowInnerHeight: 2000, showGuides: false }
    );
    expect(scale).toBeCloseTo(0.12);
  });
});

describe("stepOverlayZoom / clampOverlayZoom", () => {
  it("steps up to the next round 25% multiple", () => {
    expect(stepOverlayZoom(0.63, 1)).toBeCloseTo(0.75);
  });

  it("steps down to the previous round 25% multiple", () => {
    expect(stepOverlayZoom(0.63, -1)).toBeCloseTo(0.5);
  });

  it("clamps to the [0.25, 4] range", () => {
    expect(clampOverlayZoom(10)).toBe(4);
    expect(clampOverlayZoom(0.01)).toBe(0.25);
  });
});

describe("overlayCanvasScale / canvasPointFromEvent", () => {
  it("derives scale from stage offset width vs logical canvas width", () => {
    expect(overlayCanvasScale({ width: 1920, height: 1080 }, { offsetWidth: 960 })).toBeCloseTo(0.5);
  });

  it("falls back to logical width when stage has no offsetWidth yet", () => {
    expect(overlayCanvasScale({ width: 1920, height: 1080 }, { offsetWidth: 0 })).toBe(1);
  });

  it("converts a client point into canvas coordinates using the rect and scale", () => {
    const point = canvasPointFromEvent(150, 100, { left: 50, top: 20 }, 0.5);
    expect(point).toEqual({ x: 200, y: 160 });
  });
});

describe("overlayGuidesWithCenter", () => {
  it("appends the horizontal center for the vertical axis (canvas width / 2)", () => {
    expect(overlayGuidesWithCenter("vertical", [10], { width: 1920, height: 1080 })).toEqual([10, 960]);
  });

  it("appends the vertical center for the horizontal axis (canvas height / 2)", () => {
    expect(overlayGuidesWithCenter("horizontal", [], { width: 1920, height: 1080 })).toEqual([540]);
  });
});

describe("snapEdge", () => {
  it("snaps to the nearest guide within threshold", () => {
    expect(snapEdge(103, [100], 1, true)).toBe(100);
  });

  it("leaves the value untouched when guides are hidden", () => {
    expect(snapEdge(103, [100], 1, false)).toBe(103);
  });

  it("leaves the value untouched when beyond the threshold", () => {
    expect(snapEdge(200, [100], 1, true)).toBe(200);
  });

  it("scales the threshold down as zoom increases", () => {
    expect(snapEdge(105, [100], 2, true)).toBe(105);
  });
});

describe("snapMovePosition", () => {
  it("snaps the leading edge to a guide", () => {
    expect(snapMovePosition(98, 200, [100], 1, true)).toBe(100);
  });

  it("snaps the center to a guide", () => {
    expect(snapMovePosition(298, 200, [400], 1, true)).toBe(300);
  });

  it("snaps the trailing edge to a guide", () => {
    expect(snapMovePosition(498, 200, [700], 1, true)).toBe(500);
  });

  it("leaves the position untouched when guides are hidden", () => {
    expect(snapMovePosition(98, 200, [100], 1, false)).toBe(98);
  });
});

describe("pickRulerStep", () => {
  it("picks a nice step whose on-screen size is at least 50px", () => {
    expect(pickRulerStep(1)).toBe(50);
    expect(pickRulerStep(0.1)).toBe(500);
    expect(pickRulerStep(5)).toBe(10);
  });

  it("falls back to the largest step for very small scales", () => {
    expect(pickRulerStep(0.001)).toBe(5000);
  });
});
