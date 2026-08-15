import { apiDelete, apiGet, apiPostFile, ApiError } from "./client";

export interface LocalMediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
  createdAt: number;
}

export interface RemoteMediaItem {
  url: string;
  type: "image" | "video";
  overlayName: string | null;
}

export function listLocalMedia(): Promise<LocalMediaItem[]> {
  return apiGet<{ media: LocalMediaItem[] }>("/api/media").then((body) => body.media);
}

export function uploadLocalMedia(file: File): Promise<LocalMediaItem> {
  return apiPostFile<{ media: LocalMediaItem }>(`/api/media?filename=${encodeURIComponent(file.name)}`, file).then((body) => body.media);
}

export function deleteLocalMedia(id: string): Promise<void> {
  return apiDelete(`/api/media?id=${encodeURIComponent(id)}`);
}

// 401/404 signifie "StreamElements non connecté" côté serveur — traité comme
// un état normal (pas une erreur) par l'appelant, cf. stores/media.ts.
export async function listStreamElementsMedia(): Promise<RemoteMediaItem[] | null> {
  try {
    const body = await apiGet<{ media: RemoteMediaItem[] }>("/api/integrations/streamelements/media");
    return body.media;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null;
    throw error;
  }
}
