import { test } from "node:test";
import assert from "node:assert/strict";
import { createSpotifyAuth, spotifyRedirectUri } from "../lib/spotify-auth.mjs";

const REDIRECT = spotifyRedirectUri(4173);

test("spotifyRedirectUri utilise 127.0.0.1", () => {
  assert.equal(REDIRECT, "http://127.0.0.1:4173/api/spotify/callback");
});

test("start exige le Client ID et le Client Secret", () => {
  const auth = createSpotifyAuth({ redirectUri: REDIRECT });
  assert.throws(() => auth.start({ clientId: "abc", clientSecret: " " }));
});

test("connexion complète : autorisation, échange du code, token remis une seule fois", async () => {
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return { ok: true, status: 200, json: async () => ({ refresh_token: "refresh-123", access_token: "x" }) };
  };
  const auth = createSpotifyAuth({ redirectUri: REDIRECT, fetchImpl });
  const { state, url } = auth.start({ clientId: "client", clientSecret: "shh" });
  const authorize = new URL(url);
  assert.equal(authorize.origin, "https://accounts.spotify.com");
  assert.equal(authorize.searchParams.get("redirect_uri"), REDIRECT);
  assert.equal(authorize.searchParams.get("state"), state);
  assert.deepEqual(auth.takeResult(state), { status: "pending" });

  const result = await auth.callback({ state, code: "the-code" });
  assert.equal(result.ok, true);
  assert.equal(request.init.body.get("code"), "the-code");
  assert.equal(request.init.headers.Authorization, "Basic " + Buffer.from("client:shh").toString("base64"));

  assert.deepEqual(auth.takeResult(state), { status: "done", refreshToken: "refresh-123" });
  assert.deepEqual(auth.takeResult(state), { status: "unknown" });
});

test("refus et state inconnu", async () => {
  const auth = createSpotifyAuth({ redirectUri: REDIRECT, fetchImpl: async () => assert.fail("pas d'échange") });
  assert.equal((await auth.callback({ state: "nope", code: "c" })).ok, false);
  const { state } = auth.start({ clientId: "a", clientSecret: "b" });
  assert.equal((await auth.callback({ state, error: "access_denied" })).ok, false);
  assert.deepEqual(auth.takeResult(state), { status: "error", error: "Autorisation refusée." });
});

test("une demande expire après 10 minutes", () => {
  let clock = 0;
  const auth = createSpotifyAuth({ redirectUri: REDIRECT, now: () => clock });
  const { state } = auth.start({ clientId: "a", clientSecret: "b" });
  clock = 11 * 60 * 1000;
  assert.deepEqual(auth.takeResult(state), { status: "unknown" });
});
