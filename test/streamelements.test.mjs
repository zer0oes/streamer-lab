import test from "node:test";
import assert from "node:assert/strict";
import {
  activityToWidgetEvent,
  astroToLabEvents,
  chatMessageToWidgetData,
  convertOverlayWidget,
  parseEnv
} from "../lib/streamelements.mjs";

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

test("convertOverlayWidget importe un Custom Widget avec des champs reels", () => {
  const result = convertOverlayWidget({
    id: 6,
    type: "se-widget-custom-event-list",
    name: "zer0oes Goal bar",
    css: { "z-index": 7, width: 450, height: 70, top: "970px", left: "-22px" },
    variables: {
      html: "<div>goal</div>",
      css: ".goal {}",
      js: "console.log('goal');",
      fields: JSON.stringify({ widgetName: { type: "hidden", value: "Nova Goal Bar" } }),
      fieldData: { eventsLimit: 5, widgetName: "Nova Goal Bar" }
    }
  });
  assert.equal(result.kind, "custom");
  assert.equal(result.name, "zer0oes Goal bar");
  assert.equal(result.x, -22);
  assert.equal(result.y, 970);
  assert.equal(result.w, 450);
  assert.equal(result.h, 70);
  assert.equal(result.z, 7);
  assert.equal(result.html, "<div>goal</div>");
  assert.deepEqual(result.fields, { widgetName: { type: "hidden", value: "Nova Goal Bar" } });
  // Les cles parasites de fieldData (eventsLimit...) ne doivent pas fuiter dans fields.
  assert.equal(result.fields.eventsLimit, undefined);
});

test("convertOverlayWidget importe un Custom Widget sans champs configurables (fields vide)", () => {
  const result = convertOverlayWidget({
    type: "se-widget-custom-event-list",
    name: "BAR",
    css: { "z-index": 2, width: 1880, height: 10, top: "1037.68px", left: "20.00px" },
    variables: {
      html: "<div class=\"line\"></div>",
      css: ".line {}",
      js: "console.log('bar');",
      fields: "",
      fieldData: { eventsLimit: 5 }
    }
  });
  assert.equal(result.kind, "custom");
  assert.deepEqual(result.fields, {});
});

test("convertOverlayWidget traite un Event List non personnalise (meme type qu'un Custom Widget) comme repere", () => {
  const result = convertOverlayWidget({
    type: "se-widget-custom-event-list",
    name: "Event List",
    css: { width: 400, height: 200, top: 0, left: 0 },
    variables: { html: "", css: "", js: "", fields: "", fieldData: { eventsLimit: 5 } }
  });
  assert.equal(result.kind, "placeholder");
  assert.equal(result.sourceType, "native");
});

test("convertOverlayWidget mappe les types natifs connus vers un sourceType lisible", () => {
  assert.equal(convertOverlayWidget({ type: "video", css: {} }).sourceType, "video");
  assert.equal(convertOverlayWidget({ type: "se-widget-group", css: {} }).sourceType, "group");
  assert.equal(convertOverlayWidget({ type: "se-widget-alert-box", css: {} }).sourceType, "alert-box");
  assert.equal(convertOverlayWidget({ type: "unknown-widget", css: {} }).sourceType, "native");
});
