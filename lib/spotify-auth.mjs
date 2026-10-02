// Connexion Spotify depuis le labo (bouton « Connecter Spotify » des widgets
// musique) : remplace `npm run spotify:token` pour obtenir le refresh token.
//
// 1. Le labo envoie le Client ID et le Client Secret saisis dans le widget
//    (start) et ouvre l'adresse d'autorisation Spotify renvoyée.
// 2. Spotify redirige vers /api/spotify/callback (callback) : le code est
//    échangé contre un refresh token, gardé en mémoire quelques minutes.
// 3. Le labo récupère ce token (takeResult) et remplit le champ du widget.
// Rien n'est écrit sur le disque ici : le token suit le chemin des autres
// champs sensibles (data/secrets.json, jamais dans library/).
import { randomBytes } from "node:crypto";

const SCOPES = "user-read-currently-playing user-read-playback-state";
const PENDING_TTL_MS = 10 * 60 * 1000;

export function spotifyRedirectUri(port) {
  // Spotify n'accepte http que sur l'adresse de bouclage 127.0.0.1 (pas « localhost »)
  return `http://127.0.0.1:${port}/api/spotify/callback`;
}

export function createSpotifyAuth({ redirectUri, fetchImpl = fetch, now = Date.now }) {
  // state -> { clientId, clientSecret, createdAt, status, refreshToken?, error? }
  const pending = new Map();

  function prune() {
    for (const [state, entry] of pending) {
      if (now() - entry.createdAt > PENDING_TTL_MS) pending.delete(state);
    }
  }

  function start({ clientId, clientSecret }) {
    const id = String(clientId || "").trim();
    const secret = String(clientSecret || "").trim();
    if (!id || !secret) throw new Error("Renseigne d'abord le Client ID et le Client Secret du widget.");
    prune();
    const state = randomBytes(16).toString("hex");
    pending.set(state, { clientId: id, clientSecret: secret, createdAt: now(), status: "pending" });
    const url = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
      response_type: "code",
      client_id: id,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      show_dialog: "true"
    });
    return { state, url, redirectUri };
  }

  async function callback({ state, code, error }) {
    const entry = pending.get(String(state || ""));
    if (!entry) return { ok: false, message: "Demande expirée ou inconnue : relance la connexion depuis le labo." };
    if (error || !code) {
      Object.assign(entry, { status: "error", error: error === "access_denied" ? "Autorisation refusée." : `Autorisation impossible (${error || "code manquant"}).` });
      return { ok: false, message: entry.error };
    }
    try {
      const response = await fetchImpl("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${entry.clientId}:${entry.clientSecret}`).toString("base64")
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.refresh_token) throw new Error(data.error_description || data.error || `HTTP ${response.status}`);
      Object.assign(entry, { status: "done", refreshToken: data.refresh_token });
      return { ok: true, message: "Spotify est connecté ! Tu peux fermer cet onglet et revenir au labo." };
    } catch (err) {
      Object.assign(entry, { status: "error", error: `Échec de la connexion : ${err.message}` });
      return { ok: false, message: entry.error };
    }
  }

  // Résultat d'une connexion : « pending » tant que l'autorisation n'est pas
  // revenue ; le token n'est remis qu'une fois, puis oublié.
  function takeResult(state) {
    prune();
    const entry = pending.get(String(state || ""));
    if (!entry) return { status: "unknown" };
    if (entry.status === "pending") return { status: "pending" };
    pending.delete(state);
    return entry.status === "done" ? { status: "done", refreshToken: entry.refreshToken } : { status: "error", error: entry.error };
  }

  return { start, callback, takeResult };
}
