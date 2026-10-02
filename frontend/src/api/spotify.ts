import { apiGet, apiPost } from "./client";

// Connexion Spotify des widgets musique (cf. lib/spotify-auth.mjs côté serveur)

export interface SpotifyAuthorization {
  state: string;
  url: string;
  redirectUri: string;
}

export type SpotifyAuthResult =
  | { status: "pending" | "unknown" }
  | { status: "done"; refreshToken: string }
  | { status: "error"; error: string };

export function getSpotifyRedirectUri(): Promise<string> {
  return apiGet<{ redirectUri: string }>("/api/spotify/redirect-uri").then((body) => body.redirectUri);
}

export function startSpotifyAuthorization(clientId: string, clientSecret: string): Promise<SpotifyAuthorization> {
  return apiPost<SpotifyAuthorization>("/api/spotify/authorize", { clientId, clientSecret });
}

export function getSpotifyAuthResult(state: string): Promise<SpotifyAuthResult> {
  return apiGet<SpotifyAuthResult>(`/api/spotify/result?state=${encodeURIComponent(state)}`);
}
