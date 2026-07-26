import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_COOKIE_NAME,
  buildTwitchAuthorizeUrl,
  exchangeCodeForToken,
  fetchTwitchUser,
  requireSession,
  signSessionCookie,
  verifySessionCookie
} from "../lib/auth.mjs";
import { createDb } from "../lib/db.mjs";

const SECRET = "test-secret";

test("signSessionCookie puis verifySessionCookie retrouve le meme id de session", () => {
  const cookie = signSessionCookie("session-123", SECRET);
  assert.equal(verifySessionCookie(cookie, SECRET), "session-123");
});

test("verifySessionCookie rejette une signature alteree", () => {
  const cookie = signSessionCookie("session-123", SECRET);
  const tampered = `${cookie}xx`;
  assert.equal(verifySessionCookie(tampered, SECRET), null);
});

test("verifySessionCookie rejette une valeur signee avec un autre secret", () => {
  const cookie = signSessionCookie("session-123", "autre-secret");
  assert.equal(verifySessionCookie(cookie, SECRET), null);
});

test("verifySessionCookie rejette une valeur sans separateur ou vide", () => {
  assert.equal(verifySessionCookie("", SECRET), null);
  assert.equal(verifySessionCookie("pas-de-point", SECRET), null);
  assert.equal(verifySessionCookie(null, SECRET), null);
});

test("requireSession retrouve la session et l'utilisateur via le cookie", () => {
  const store = createDb(":memory:");
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const session = store.createSession(user.id);
  const cookieHeader = `${SESSION_COOKIE_NAME}=${signSessionCookie(session.id, SECRET)}`;

  const result = requireSession({ cookieHeader, secret: SECRET, store });
  assert.ok(result);
  assert.equal(result.user.id, user.id);
});

test("requireSession retourne null sans cookie, avec un secret vide, ou pour une session expiree", () => {
  const store = createDb(":memory:");
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });

  assert.equal(requireSession({ cookieHeader: "", secret: SECRET, store }), null);
  assert.equal(requireSession({ cookieHeader: undefined, secret: SECRET, store }), null);

  const session = store.createSession(user.id);
  const cookieHeader = `${SESSION_COOKIE_NAME}=${signSessionCookie(session.id, SECRET)}`;
  assert.equal(requireSession({ cookieHeader, secret: "", store }), null);

  const expired = store.createSession(user.id, { ttlMs: -1000 });
  const expiredHeader = `${SESSION_COOKIE_NAME}=${signSessionCookie(expired.id, SECRET)}`;
  assert.equal(requireSession({ cookieHeader: expiredHeader, secret: SECRET, store }), null);
});

test("buildTwitchAuthorizeUrl construit l'URL d'autorisation avec le bon state", () => {
  const url = new URL(buildTwitchAuthorizeUrl({
    clientId: "client-abc",
    redirectUri: "http://localhost:4173/auth/twitch/callback",
    state: "state-xyz"
  }));
  assert.equal(url.origin + url.pathname, "https://id.twitch.tv/oauth2/authorize");
  assert.equal(url.searchParams.get("client_id"), "client-abc");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:4173/auth/twitch/callback");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "state-xyz");
});

test("exchangeCodeForToken poste les bons champs et retourne le JSON", async () => {
  let capturedUrl;
  let capturedInit;
  const fakeFetch = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return { ok: true, json: async () => ({ access_token: "tok-123" }) };
  };

  const result = await exchangeCodeForToken(
    { code: "code-1", clientId: "cid", clientSecret: "csecret", redirectUri: "http://localhost/callback" },
    fakeFetch
  );

  assert.equal(capturedUrl, "https://id.twitch.tv/oauth2/token");
  assert.equal(capturedInit.method, "POST");
  const body = new URLSearchParams(capturedInit.body);
  assert.equal(body.get("code"), "code-1");
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(result.access_token, "tok-123");
});

test("exchangeCodeForToken leve une erreur si Twitch repond en erreur", async () => {
  const fakeFetch = async () => ({ ok: false, status: 400 });
  await assert.rejects(() => exchangeCodeForToken({ code: "x", clientId: "a", clientSecret: "b", redirectUri: "c" }, fakeFetch));
});

test("fetchTwitchUser lit le premier utilisateur et ne garde que les champs utiles", async () => {
  const fakeFetch = async (url, init) => {
    assert.equal(url, "https://api.twitch.tv/helix/users");
    assert.equal(init.headers.Authorization, "Bearer tok-123");
    assert.equal(init.headers["Client-Id"], "cid");
    return {
      ok: true,
      json: async () => ({ data: [{ id: "999", login: "zer0oes", display_name: "zer0oes", profile_image_url: "https://x/y.png" }] })
    };
  };

  const user = await fetchTwitchUser("tok-123", "cid", fakeFetch);
  assert.deepEqual(user, {
    twitchId: "999",
    twitchLogin: "zer0oes",
    displayName: "zer0oes",
    avatarUrl: "https://x/y.png"
  });
});

test("fetchTwitchUser leve une erreur si la reponse ne contient aucun utilisateur", async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ data: [] }) });
  await assert.rejects(() => fetchTwitchUser("tok", "cid", fakeFetch));
});
