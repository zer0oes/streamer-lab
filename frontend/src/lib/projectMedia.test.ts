import { describe, expect, it } from "vitest";
import type { OverlayEntry } from "../api/types";
import type { OverlayItem } from "./overlayTypes";
import { filterMediaUsedByOverlays } from "./projectMedia";

function overlay(items: Partial<OverlayItem>[], extra: Partial<OverlayEntry> = {}): OverlayEntry {
  return { name: "Overlay", sourcePlatform: null, items: items as OverlayItem[], ...extra } as OverlayEntry;
}

describe("filterMediaUsedByOverlays", () => {
  const media = [
    { url: "/library-media/fond.jpg" },
    { url: "https://cdn.example.com/loop.webm" },
    { url: "https://cdn.example.com/inutilise.png" },
    { url: "https://cdn.streamelements.com/alerte.gif", overlayName: "STREAM PAUSED" }
  ];

  it("garde les médias référencés par un item, même imbriqués ou dans du CSS", () => {
    const result = filterMediaUsedByOverlays(media, [
      overlay([
        { type: "image", props: { src: "/library-media/fond.jpg" } },
        { type: "placeholder", props: { preview: { kind: "code", css: "body{background:url(https://cdn.example.com/loop.webm)}" } } }
      ])
    ]);
    expect(result.map((item) => item.url)).toEqual(["/library-media/fond.jpg", "https://cdn.example.com/loop.webm"]);
  });

  it("rattache les médias StreamElements à l'overlay importé du même nom", () => {
    const result = filterMediaUsedByOverlays(media, [overlay([], { name: "STREAM PAUSED", sourcePlatform: "streamelements" })]);
    expect(result.map((item) => item.url)).toEqual(["https://cdn.streamelements.com/alerte.gif"]);
  });

  it("ne garde rien sans overlay", () => {
    expect(filterMediaUsedByOverlays(media, [])).toEqual([]);
  });
});
