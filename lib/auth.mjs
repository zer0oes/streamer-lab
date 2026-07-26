import { createHmac, timingSafeEqual } from "node:crypto";
import { parseCookies } from "./cookies.mjs";
import { store as defaultStore } from "./db.mjs";

export const SESSION_COOKIE_NAME = "swx_session";
export const OAUTH_STATE_COOKIE_NAME = "swx_oauth_state";

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Construit la valeur du cookie de session : "<id>.<signature>". */
export function signSessionCookie(sessionId, secret) {
  return `${sessionId}.${sign(sessionId, secret)}`;
}

/** Verifie la signature d'un cookie de session et retourne l'id de session, ou null. */
export function verifySessionCookie(cookieValue, secret) {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex === -1) return null;
  const sessionId = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expected = Buffer.from(sign(sessionId, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;
  return sessionId;
}

/** Verifie le cookie de session present dans l'en-tete Cookie et retourne { session, user } ou null. */
export function requireSession({ cookieHeader, secret, store = defaultStore }) {
  if (!secret) return null;
  const cookies = parseCookies(cookieHeader);
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return null;
  const sessionId = verifySessionCookie(raw, secret);
  if (!sessionId) return null;
  return store.getSessionWithUser(sessionId);
}

/** Construit l'URL d'autorisation Twitch. Aucun scope necessaire : on ne veut que l'identite. */
export function buildTwitchAuthorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "");
  return url.toString();
}

/** Echange le code d'autorisation contre un access_token Twitch. */
export async function exchangeCodeForToken({ code, clientId, clientSecret, redirectUri }, fetchImpl = fetch) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });
  const response = await fetchImpl("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!response.ok) throw new Error(`Echange du code Twitch echoue (${response.status})`);
  return response.json();
}

/** Recupere le profil Twitch associe a un access_token. Le token n'est jamais persiste. */
export async function fetchTwitchUser(accessToken, clientId, fetchImpl = fetch) {
  const response = await fetchImpl("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": clientId
    }
  });
  if (!response.ok) throw new Error(`Recuperation du profil Twitch echouee (${response.status})`);
  const payload = await response.json();
  const user = payload.data?.[0];
  if (!user) throw new Error("Reponse Twitch sans utilisateur");
  return {
    twitchId: user.id,
    twitchLogin: user.login,
    displayName: user.display_name,
    avatarUrl: user.profile_image_url
  };
}
