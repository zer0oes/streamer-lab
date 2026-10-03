import { apiDelete, apiGet, apiPost } from "./client";
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
// connecté, une chaîne qu'il gère (rôle administrator, editor...), ou une
// chaîne ajoutée à la main avec son propre jeton (source "token").
export interface StreamElementsChannel {
  id: string;
  name: string;
  provider: string | null;
  role: string | null;
  source: "account" | "token";
}

export type StreamElementsChannelTokenType = "jwt" | "apikey";

export function listStreamElementsChannels(): Promise<{ channels: StreamElementsChannel[]; defaultChannelId: string }> {
  return apiGet<{ channels: StreamElementsChannel[]; defaultChannelId: string }>("/api/integrations/streamelements/channels");
}

export function addStreamElementsChannel(token: string, tokenType: StreamElementsChannelTokenType): Promise<StreamElementsChannel> {
  return apiPost<{ channel: StreamElementsChannel }>("/api/integrations/streamelements/channels", { token, tokenType }).then(
    (body) => body.channel
  );
}

export function removeStreamElementsChannel(channelId: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/api/integrations/streamelements/channels?channelId=${encodeURIComponent(channelId)}`);
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
