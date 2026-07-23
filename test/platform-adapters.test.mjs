import test from "node:test";
import assert from "node:assert/strict";
import {
  PLATFORM_STREAMLABS,
  buildStreamlabsLoadDetail,
  normalizePlatform,
  toStreamlabsEvent
} from "../public/platform-adapters.js";

test("normalise la plateforme du sandbox", () => {
  assert.equal(normalizePlatform("streamlabs"), PLATFORM_STREAMLABS);
  assert.equal(normalizePlatform("inconnue"), "streamelements");
});

test("construit custom_json pour onLoad Streamlabs", () => {
  const detail = buildStreamlabsLoadDetail({
    title: { type: "text", label: "Titre", value: "Défaut" }
  }, { title: "Personnalisé" }, { total: 12 });

  assert.equal(detail.custom_json.title.name, "title");
  assert.equal(detail.custom_json.title.value, "Personnalisé");
  assert.equal(detail.fieldData.title, "Personnalisé");
  assert.deepEqual(detail.session, { total: 12 });
});

test("convertit les événements StreamElements vers Streamlabs", () => {
  const follow = toStreamlabsEvent({
    listener: "follower-latest",
    event: { name: "NovaViewer" }
  });
  assert.equal(follow.type, "follow");
  assert.equal(follow.name, "NovaViewer");
  assert.equal(follow.platform, "twitch_account");

  const tip = toStreamlabsEvent({
    listener: "tip-latest",
    event: { name: "NovaViewer", amount: 5, message: "Bravo" }
  });
  assert.equal(tip.type, "donation");
  assert.equal(tip.formattedAmount, "5.00 €");
  assert.equal(tip.message, "Bravo");

  const chat = toStreamlabsEvent({
    listener: "message",
    event: { data: { displayName: "NovaViewer", text: "Bonjour", badges: [] } }
  });
  assert.equal(chat.type, "message");
  assert.equal(chat.name, "NovaViewer");
  assert.equal(chat.message, "Bonjour");
  assert.deepEqual(chat.badges, []);
});
