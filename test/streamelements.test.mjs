import test from "node:test";
import assert from "node:assert/strict";
import { activityToWidgetEvent, astroToLabEvents, chatMessageToWidgetData, parseEnv } from "../lib/streamelements.mjs";

test("normalise un follow Astro", () => {
  const result = activityToWidgetEvent({
    type: "follow",
    provider: "twitch",
    activityId: "abc",
    data: { username: "alice", displayName: "Alice" }
  });
  assert.equal(result.listener, "follower-latest");
  assert.equal(result.event.name, "Alice");
  assert.equal(result.event.activityId, "abc");
});

test("applique une mise a jour de session sans muter l'objet initial", () => {
  const initial = { "follower-session": { count: 1 } };
  const [result] = astroToLabEvents({
    type: "message",
    topic: "channel.session.update",
    data: { key: "follower-latest", data: { name: "Bob" } }
  }, initial);
  assert.deepEqual(result.detail.session["follower-latest"], { name: "Bob" });
  assert.equal(initial["follower-latest"], undefined);
});

test("lit un fichier .env simple", () => {
  assert.deepEqual(parseEnv("# test\nA=1\nB=\"deux mots\"\n"), { A: "1", B: "deux mots" });
});

test("normalise un message Twitch Astro pour event.data", () => {
  const result = chatMessageToWidgetData({
    chatter_user_id: "42",
    chatter_user_login: "alice",
    chatter_user_name: "Alice",
    color: "#ff00ff",
    message: { text: "Bonjour", fragments: [] },
    badges: [{ set_id: "subscriber", id: "12", info: "" }]
  });
  assert.equal(result.displayName, "Alice");
  assert.equal(result.text, "Bonjour");
  assert.deepEqual(result.badges[0], { type: "subscriber", version: "12", info: "" });
});
