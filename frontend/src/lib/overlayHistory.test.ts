import { describe, expect, it } from "vitest";
import { OVERLAY_HISTORY_LIMIT, OverlayHistory } from "./overlayHistory";

describe("OverlayHistory", () => {
  it("cannot undo/redo right after reset", () => {
    const history = new OverlayHistory<number>();
    history.reset(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("undoes back to the previous pushed snapshot", () => {
    const history = new OverlayHistory<number>();
    history.reset(0);
    history.push(1);
    history.push(2);
    expect(history.undo()).toBe(1);
    expect(history.undo()).toBe(0);
    expect(history.canUndo()).toBe(false);
  });

  it("redoes forward after an undo", () => {
    const history = new OverlayHistory<number>();
    history.reset(0);
    history.push(1);
    history.push(2);
    history.undo();
    expect(history.redo()).toBe(2);
    expect(history.canRedo()).toBe(false);
  });

  it("discards the redo branch once a new snapshot is pushed after an undo", () => {
    const history = new OverlayHistory<number>();
    history.reset(0);
    history.push(1);
    history.push(2);
    history.undo();
    history.push(99);
    expect(history.canRedo()).toBe(false);
    expect(history.undo()).toBe(1);
  });

  it("caps the number of retained snapshots", () => {
    const history = new OverlayHistory<number>();
    history.reset(0);
    for (let i = 1; i <= OVERLAY_HISTORY_LIMIT + 20; i += 1) history.push(i);
    let steps = 0;
    while (history.canUndo()) {
      history.undo();
      steps += 1;
    }
    expect(steps).toBe(OVERLAY_HISTORY_LIMIT - 1);
  });

  it("returns null when undo/redo is called with nothing to do", () => {
    const history = new OverlayHistory<number>();
    history.reset(0);
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
  });
});
