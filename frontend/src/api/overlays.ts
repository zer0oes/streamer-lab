import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import type { OverlayEntry } from "./types";

export interface OverlayMetadataInput {
  name: string;
  description: string;
  icon: string;
  width: number;
  height: number;
}

export function listOverlays(): Promise<OverlayEntry[]> {
  return apiGet<{ overlays: OverlayEntry[] }>("/api/overlays").then((body) => body.overlays);
}

export function createOverlay(input: OverlayMetadataInput, projectId: string): Promise<OverlayEntry> {
  return apiPost<{ overlay: OverlayEntry }>("/api/overlays", { ...input, projectId }).then((body) => body.overlay);
}

export function updateOverlayMetadata(overlayId: string, input: OverlayMetadataInput): Promise<OverlayEntry> {
  return apiPut<{ overlay: OverlayEntry }>("/api/overlay/metadata", { overlayId, ...input }).then((body) => body.overlay);
}

export function deleteOverlay(overlayId: string): Promise<void> {
  return apiDelete(`/api/overlay?id=${encodeURIComponent(overlayId)}`);
}

export function moveOverlayToProject(overlayId: string, projectId: string): Promise<OverlayEntry> {
  return apiPut<{ overlay: OverlayEntry; movedWidgetIds: string[] }>("/api/overlay/project", { overlayId, projectId }).then(
    (body) => body.overlay
  );
}
