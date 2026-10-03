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

// Chaîne StreamElements dont on peut importer les overlays : celle du compte
// connecté, ou une chaîne qu'il gère (rôle administrator, editor...).
export interface StreamElementsChannel {
  id: string;
  name: string;
  provider: string | null;
  role: string | null;
}

export function listStreamElementsChannels(): Promise<{ channels: StreamElementsChannel[]; defaultChannelId: string }> {
  return apiGet<{ channels: StreamElementsChannel[]; defaultChannelId: string }>("/api/integrations/streamelements/channels");
}

export function listStreamElementsOverlays(channelId?: string): Promise<StreamElementsOverlaySummary[]> {
  const query = channelId ? `?channelId=${encodeURIComponent(channelId)}` : "";
  return apiGet<{ overlays: StreamElementsOverlaySummary[] }>(`/api/integrations/streamelements/overlays${query}`).then(
    (body) => body.overlays
  );
}

export function importStreamElementsOverlay(overlayId: string, projectId: string, channelId?: string): Promise<StreamElementsOverlayImportResult> {
  return apiPost<StreamElementsOverlayImportResult>("/api/integrations/streamelements/overlays/import", { overlayId, projectId, channelId });
}
