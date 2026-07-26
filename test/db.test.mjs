import test from "node:test";
import assert from "node:assert/strict";
import { createDb } from "../lib/db.mjs";

function freshDb() {
  return createDb(":memory:");
}

test("cree un utilisateur puis le retrouve par twitch_id", () => {
  const store = freshDb();
  const created = store.upsertUserFromTwitch({
    twitchId: "12345",
    twitchLogin: "zer0oes",
    displayName: "zer0oes",
    avatarUrl: "https://example.com/a.png"
  });
  assert.equal(created.twitch_id, "12345");

  const found = store.getUserByTwitchId("12345");
  assert.equal(found.id, created.id);
  assert.equal(found.display_name, "zer0oes");
});

test("un second upsert avec le meme twitch_id met a jour au lieu de dupliquer", () => {
  const store = freshDb();
  const first = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "old", displayName: "Old Name", avatarUrl: null });
  const second = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "new", displayName: "New Name", avatarUrl: null });

  assert.equal(first.id, second.id);
  assert.equal(second.twitch_login, "new");
  assert.equal(second.display_name, "New Name");
});

test("cree une session puis la retrouve avec l'utilisateur associe", () => {
  const store = freshDb();
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const session = store.createSession(user.id);

  const result = store.getSessionWithUser(session.id);
  assert.ok(result);
  assert.equal(result.user.id, user.id);
  assert.equal(result.session.id, session.id);
});

test("une session expiree n'est plus retrouvable", () => {
  const store = freshDb();
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const session = store.createSession(user.id, { ttlMs: -1000 });

  assert.equal(store.getSessionWithUser(session.id), null);
});

test("supprimer une session la rend introuvable", () => {
  const store = freshDb();
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const session = store.createSession(user.id);
  store.deleteSession(session.id);

  assert.equal(store.getSessionWithUser(session.id), null);
});

test("upsertIntegration respecte l'unicite (user_id, provider) et met a jour en place", () => {
  const store = freshDb();
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });

  const first = store.upsertIntegration({
    userId: user.id,
    provider: "streamelements",
    channelId: "chan-1",
    channelName: "MaChaine",
    tokenCiphertext: "c1",
    tokenIv: "iv1",
    tokenAuthTag: "tag1",
    tokenType: "jwt",
    topics: null
  });

  const second = store.upsertIntegration({
    userId: user.id,
    provider: "streamelements",
    channelId: "chan-1",
    channelName: "MaChaine",
    tokenCiphertext: "c2",
    tokenIv: "iv2",
    tokenAuthTag: "tag2",
    tokenType: "jwt",
    topics: null
  });

  assert.equal(first.id, second.id);
  assert.equal(store.listIntegrationsForUser(user.id).length, 1);
  assert.equal(store.getIntegration(user.id, "streamelements").token_ciphertext, "c2");
});

test("deleteIntegration ne touche jamais l'integration d'un autre utilisateur", () => {
  const store = freshDb();
  const userA = store.upsertUserFromTwitch({ twitchId: "a", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const userB = store.upsertUserFromTwitch({ twitchId: "b", twitchLogin: "b", displayName: "B", avatarUrl: null });

  for (const user of [userA, userB]) {
    store.upsertIntegration({
      userId: user.id,
      provider: "streamlabs",
      channelId: null,
      channelName: null,
      tokenCiphertext: "c",
      tokenIv: "iv",
      tokenAuthTag: "tag",
      tokenType: null,
      topics: null
    });
  }

  const deleted = store.deleteIntegration(userA.id, "streamlabs");
  assert.equal(deleted, true);
  assert.equal(store.getIntegration(userA.id, "streamlabs"), null);
  assert.ok(store.getIntegration(userB.id, "streamlabs"), "l'integration de userB doit rester intacte");
});

test("supprimer un utilisateur supprime en cascade ses sessions et integrations", () => {
  const store = freshDb();
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const session = store.createSession(user.id);
  store.upsertIntegration({
    userId: user.id,
    provider: "streamlabs",
    channelId: null,
    channelName: null,
    tokenCiphertext: "c",
    tokenIv: "iv",
    tokenAuthTag: "tag",
    tokenType: null,
    topics: null
  });

  store.db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

  assert.equal(store.getSessionWithUser(session.id), null);
  assert.equal(store.getIntegration(user.id, "streamlabs"), null);
});
