// Widgets musique : le bouton « Connecter Spotify » s'affiche sous le champ du
// refresh token et lit l'identifiant de l'app Spotify dans les champs voisins.
export const SPOTIFY_CONNECT_FIELD = "spotify_refresh_token";

const text = (value: unknown): string => (value == null ? "" : String(value));

export function spotifyConnectProps(fieldData: Record<string, unknown>) {
  return {
    clientId: text(fieldData.spotify_client_id),
    clientSecret: text(fieldData.spotify_client_secret),
    connected: Boolean(text(fieldData[SPOTIFY_CONNECT_FIELD]).trim())
  };
}
