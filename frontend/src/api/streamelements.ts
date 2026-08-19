import { apiGet, apiPost } from "./client";
import type { OverlayEntry } from "./types";

export interface StreamElementsOverlaySummary {
  id: string;
  name: string;
  preview: string | null;
  widgetCount: number | null;
}

export interface StreamElementsOverlayImportResult {
  overlay: OverlayEntry;
  placeholders: number;
  updated: boolean;
}

export function listStreamElementsOverlays(): Promise<StreamElementsOverlaySummary[]> {
  return apiGet<{ overlays: StreamElementsOverlaySummary[] }>("/api/integrations/streamelements/overlays").then(
    (body) => body.overlays
  );
}

export function importStreamElementsOverlay(overlayId: string, projectId: string): Promise<StreamElementsOverlayImportResult> {
  return apiPost<StreamElementsOverlayImportResult>("/api/integrations/streamelements/overlays/import", { overlayId, projectId });
}
