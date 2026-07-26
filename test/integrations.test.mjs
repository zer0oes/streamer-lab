import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptIntegrationToken, disconnectIntegration, maskIntegration, saveManualToken } from "../lib/integrations.mjs";
import { createDb } from "../lib/db.mjs";

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("saveManualToken chiffre le token avant de le stocker", () => {
  const store = createDb(":memory:");
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });

  saveManualToken({
    userId: user.id,
    provider: "streamelements",
    channelId: "chan-1",
    channelName: "MaChaine",
    token: "super-secret-jwt",
    tokenType: "jwt",
    topics: null
  }, store);

  const row = store.getIntegration(user.id, "streamelements");
  assert.notEqual(row.token_ciphertext, "super-secret-jwt");
  assert.ok(!row.token_ciphertext.includes("super-secret-jwt"));
  assert.equal(decryptIntegrationToken(row), "super-secret-jwt");
});

test("maskIntegration ne renvoie jamais le secret ni ses composants", () => {
  const store = createDb(":memory:");
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const saved = saveManualToken({
    userId: user.id,
    provider: "streamlabs",
    channelId: null,
    channelName: null,
    token: "socket-token",
    tokenType: null,
    topics: null
  }, store);

  assert.equal(saved.provider, "streamlabs");
  for (const forbiddenKey of ["token", "tokenCiphertext", "token_ciphertext", "iv", "authTag"]) {
    assert.equal(saved[forbiddenKey], undefined);
  }
});

test("disconnectIntegration d'un utilisateur ne supprime jamais celle d'un autre", () => {
  const store = createDb(":memory:");
  const userA = store.upsertUserFromTwitch({ twitchId: "a", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const userB = store.upsertUserFromTwitch({ twitchId: "b", twitchLogin: "b", displayName: "B", avatarUrl: null });

  for (const user of [userA, userB]) {
    saveManualToken({
      userId: user.id,
      provider: "streamelements",
      channelId: "c",
      channelName: "c",
      token: "t",
      tokenType: "jwt",
      topics: null
    }, store);
  }

  disconnectIntegration(userA.id, "streamelements", store);

  assert.equal(store.getIntegration(userA.id, "streamelements"), null);
  assert.ok(store.getIntegration(userB.id, "streamelements"));
});
