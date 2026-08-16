import { describe, expect, it } from "vitest";
import {
  alignItemsTo,
  boundingBoxOf,
  centerOverlayItem,
  createOverlayGroup,
  createOverlayPrimitive,
  createOverlayWidgetItem,
  distributeItems,
  nextOverlayZIndex,
  overlayItemDefaultLabel,
  overlayItemLabel,
  overlayLayerIcon,
  overlayPreviewItemIcon
} from "./overlayItems";
import type { OverlayItem } from "./overlayTypes";

function item(overrides: Partial<OverlayItem>): OverlayItem {
  return { id: "i", type: "shape", x: 0, y: 0, w: 100, h: 100, z: 1, ...overrides };
}

describe("nextOverlayZIndex", () => {
  it("returns 1 for an empty list", () => {
    expect(nextOverlayZIndex([])).toBe(1);
  });

  it("returns one above the current max z", () => {
    expect(nextOverlayZIndex([item({ z: 3 }), item({ z: 7 })])).toBe(8);
  });
});

describe("createOverlayPrimitive", () => {
  it("centers the new item on the given point", () => {
    const created = createOverlayPrimitive([], "shape", 100, 100, 40, 20, { fill: "#fff" });
    expect(created.x).toBe(80);
    expect(created.y).toBe(90);
    expect(created.w).toBe(40);
    expect(created.h).toBe(20);
    expect(created.props).toEqual({ fill: "#fff" });
  });

  it("stacks above existing items", () => {
    const created = createOverlayPrimitive([item({ z: 5 })], "text", 0, 0, 10, 10, {});
    expect(created.z).toBe(6);
  });
});

describe("createOverlayWidgetItem", () => {
  it("cascades position based on item count, wrapping every 8", () => {
    const items = Array.from({ length: 8 }, (_, i) => item({ id: `w${i}` }));
    const created = createOverlayWidgetItem(items, "goal-bar", false, 400, 200);
    expect(created.x).toBe(40);
    expect(created.y).toBe(220);
    expect(created.type).toBe("widget");
  });

  it("marks alert items distinctly from widget items", () => {
    expect(createOverlayWidgetItem([], "sub-alert", true, 400, 200).type).toBe("alert");
  });
});

describe("overlayItemDefaultLabel / overlayItemLabel", () => {
  it("labels a group with its child count", () => {
    expect(overlayItemDefaultLabel(item({ type: "group", props: { children: ["a", "b", "c"] } }))).toBe("Groupe (3)");
  });

  it("falls back to the widget id for widget/alert items", () => {
    expect(overlayItemDefaultLabel(item({ type: "widget", widgetId: "goal-bar" }))).toBe("goal-bar");
  });

  it("prefers a custom name over the default label", () => {
    expect(overlayItemLabel(item({ type: "text", name: "Titre principal" }))).toBe("Titre principal");
  });
});

describe("overlayLayerIcon", () => {
  it("returns a fixed generic icon per primitive type", () => {
    expect(overlayLayerIcon(item({ type: "alert" }))).toBe("campaign");
    expect(overlayLayerIcon(item({ type: "text" }))).toBe("title");
    expect(overlayLayerIcon(item({ type: "icon", props: { name: "bolt" } }))).toBe("star");
  });

  it("falls back to a placeholder icon by sourceType, defaulting to native", () => {
    expect(overlayLayerIcon(item({ type: "placeholder", props: { sourceType: "video" } }))).toBe("videocam");
    expect(overlayLayerIcon(item({ type: "placeholder" }))).toBe("widgets");
  });

  it("resolves a widget item's icon via the lookup, defaulting to widgets", () => {
    expect(overlayLayerIcon(item({ type: "widget", widgetId: "goal-bar" }), () => "social_leaderboard")).toBe("social_leaderboard");
    expect(overlayLayerIcon(item({ type: "widget", widgetId: "missing" }), () => undefined)).toBe("widgets");
  });
});

describe("overlayPreviewItemIcon", () => {
  it("prefers the actual chosen glyph for an icon item", () => {
    expect(overlayPreviewItemIcon(item({ type: "icon", props: { name: "bolt" } }))).toBe("bolt");
  });

  it("falls back to overlayLayerIcon for everything else", () => {
    expect(overlayPreviewItemIcon(item({ type: "text" }))).toBe("title");
    expect(overlayPreviewItemIcon(item({ type: "widget", widgetId: "goal-bar" }), () => "monitoring")).toBe("monitoring");
  });
});

describe("boundingBoxOf", () => {
  it("computes the union box of several items", () => {
    const box = boundingBoxOf([item({ x: 0, y: 0, w: 50, h: 50 }), item({ x: 100, y: 20, w: 30, h: 30 })]);
    expect(box).toEqual({ x: 0, y: 0, w: 130, h: 50 });
  });
});

describe("createOverlayGroup", () => {
  it("returns null when fewer than 2 members are given", () => {
    expect(createOverlayGroup([item({ id: "a" })], ["a"])).toBeNull();
  });

  it("wraps the members' bounding box and stacks below their lowest z", () => {
    const members = [item({ id: "a", x: 0, y: 0, w: 50, h: 50, z: 3 }), item({ id: "b", x: 100, y: 0, w: 50, h: 50, z: 5 })];
    const group = createOverlayGroup(members, ["a", "b"]);
    expect(group).toMatchObject({ type: "group", x: 0, y: 0, w: 150, h: 50, z: 2 });
    expect(group?.props?.children).toEqual(["a", "b"]);
  });
});

describe("centerOverlayItem", () => {
  it("centers an item within the canvas", () => {
    expect(centerOverlayItem(item({ w: 200, h: 100 }), { width: 1920, height: 1080 })).toEqual({ x: 860, y: 490 });
  });
});

describe("alignItemsTo", () => {
  const items = [item({ id: "a", x: 0, y: 0, w: 50, h: 50 }), item({ id: "b", x: 100, y: 30, w: 20, h: 20 })];

  it("aligns to the left edge of the selection's bounding box", () => {
    expect(alignItemsTo(items, "left")).toEqual(new Map([["a", { x: 0 }], ["b", { x: 0 }]]));
  });

  it("aligns to the horizontal center of the selection's bounding box", () => {
    const updates = alignItemsTo(items, "hcenter");
    expect(updates.get("a")).toEqual({ x: 35 });
    expect(updates.get("b")).toEqual({ x: 50 });
  });

  it("aligns to the bottom edge of the selection's bounding box", () => {
    const updates = alignItemsTo(items, "bottom");
    expect(updates.get("a")).toEqual({ y: 0 });
    expect(updates.get("b")).toEqual({ y: 30 });
  });
});

describe("distributeItems", () => {
  it("does nothing with fewer than 3 items", () => {
    expect(distributeItems([item({ id: "a" }), item({ id: "b" })], "horizontal").size).toBe(0);
  });

  it("spaces the middle items evenly by center between the first and last", () => {
    const items = [
      item({ id: "a", x: 0, y: 0, w: 100, h: 100 }),
      item({ id: "b", x: 400, y: 0, w: 100, h: 100 }),
      item({ id: "c", x: 900, y: 0, w: 100, h: 100 })
    ];
    const updates = distributeItems(items, "horizontal");
    expect(updates.size).toBe(1);
    expect(updates.get("b")).toEqual({ x: 450 });
  });
});
