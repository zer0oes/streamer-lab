import test from "node:test";
import assert from "node:assert/strict";
import { saveContactMessage, validateContactMessage } from "../lib/contact.mjs";
import { createDb } from "../lib/db.mjs";

test("saveContactMessage enregistre un message sans utilisateur connecté", () => {
  const store = createDb(":memory:");
  const saved = saveContactMessage({
    userId: null, firstName: "Ada", lastName: "Lovelace", nickname: "AdaL",
    email: "ada@example.com", subject: "Bug", message: "Ça plante."
  }, store);
  assert.ok(saved.id);
  assert.equal(saved.user_id, null);
});

test("saveContactMessage associe l'utilisateur quand connecté", () => {
  const store = createDb(":memory:");
  const user = store.upsertUserFromTwitch({ twitchId: "1", twitchLogin: "a", displayName: "A", avatarUrl: null });
  const saved = saveContactMessage({
    userId: user.id, firstName: "Ada", lastName: "Lovelace", nickname: "AdaL",
    email: "ada@example.com", subject: "Bug", message: "Ça plante."
  }, store);
  assert.equal(saved.user_id, user.id);
});

test("saveContactMessage accepte prénom/nom vides (optionnels)", () => {
  const store = createDb(":memory:");
  const saved = saveContactMessage({
    userId: null, firstName: "", lastName: "", nickname: "AdaL",
    email: "ada@example.com", subject: "Bug", message: "Ça plante."
  }, store);
  assert.ok(saved.id);
});

test("validateContactMessage rejette un email invalide", () => {
  assert.throws(() => validateContactMessage({
    firstName: "Ada", lastName: "Lovelace", nickname: "AdaL", email: "pas-un-email", subject: "x", message: "x"
  }));
});

test("validateContactMessage rejette un pseudo vide", () => {
  assert.throws(() => validateContactMessage({
    firstName: "Ada", lastName: "Lovelace", nickname: "", email: "a@b.com", subject: "x", message: "x"
  }));
});
