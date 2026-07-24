import test from "node:test";
import assert from "node:assert/strict";
import { streamlabsEventToLabEvents } from "../lib/streamlabs.mjs";

test("normalise un follow Streamlabs", () => {
  const [result] = streamlabsEventToLabEvents({
    type: "follow",
    for: "twitch_account",
    message: [{ name: "h4r5h48002", _id: "abc" }]
  });
  assert.equal(result.type, "onEventReceived");
  assert.equal(result.detail.listener, "follower-latest");
  assert.equal(result.detail.event.name, "h4r5h48002");
});

test("normalise une donation Streamlabs avec montant", () => {
  const [result] = streamlabsEventToLabEvents({
    type: "donation",
    message: [{ name: "test", amount: "13.37", message: "test donation" }]
  });
  assert.equal(result.detail.listener, "tip-latest");
  assert.equal(result.detail.event.amount, 13.37);
  assert.equal(result.detail.event.message, "test donation");
});

test("ignore un type d'evenement inconnu", () => {
  assert.deepEqual(streamlabsEventToLabEvents({ type: "unknown", message: [{}] }), []);
});

test("ignore un message qui n'est pas un tableau", () => {
  assert.deepEqual(streamlabsEventToLabEvents({ type: "follow", message: { name: "x" } }), []);
});

test("gere plusieurs abonnements groupes dans le meme message", () => {
  const results = streamlabsEventToLabEvents({
    type: "subscription",
    message: [{ name: "a" }, { name: "b" }]
  });
  assert.equal(results.length, 2);
  assert.equal(results[1].detail.event.name, "b");
});
