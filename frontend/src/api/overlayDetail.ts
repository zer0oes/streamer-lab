import { apiGet, apiPut } from "./client";
import type { OverlayEntry } from "./types";
import type { OverlayGuides, OverlayItem } from "../lib/overlayTypes";

export function getOverlay(overlayId: string): Promise<OverlayEntry> {
  return apiGet<{ overlay: OverlayEntry }>(`/api/overlay?id=${encodeURIComponent(overlayId)}`).then((body) => body.overlay);
}

export function saveOverlayItems(overlayId: string, items: OverlayItem[]): Promise<void> {
  return apiPut("/api/overlay/items", { overlayId, items });
}

export function saveOverlayGuides(overlayId: string, guides: OverlayGuides): Promise<void> {
  return apiPut("/api/overlay/guides", { overlayId, guides });
}
