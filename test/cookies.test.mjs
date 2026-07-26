import test from "node:test";
import assert from "node:assert/strict";
import { parseCookies, serializeCookie } from "../lib/cookies.mjs";

test("parseCookies gere un en-tete absent ou vide", () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies(""), {});
});

test("parseCookies lit un seul cookie", () => {
  assert.deepEqual(parseCookies("swx_session=abc123"), { swx_session: "abc123" });
});

test("parseCookies lit plusieurs cookies separes par des points-virgules", () => {
  assert.deepEqual(parseCookies("a=1; b=2;c=3"), { a: "1", b: "2", c: "3" });
});

test("parseCookies tolere un point-virgule final et ignore les entrees sans valeur", () => {
  assert.deepEqual(parseCookies("a=1;"), { a: "1" });
  assert.deepEqual(parseCookies("a=1; malformed; b=2"), { a: "1", b: "2" });
});

test("parseCookies decode les valeurs encodees en URI", () => {
  assert.deepEqual(parseCookies("a=hello%20world"), { a: "hello world" });
});

test("serializeCookie pose toujours HttpOnly et SameSite=Lax", () => {
  const cookie = serializeCookie("swx_session", "abc");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
});

test("serializeCookie ajoute Secure seulement si demande", () => {
  assert.match(serializeCookie("a", "b", { secure: true }), /Secure/);
});

test("serializeCookie ajoute Max-Age quand fourni, y compris 0 pour effacer", () => {
  assert.match(serializeCookie("a", "b", { maxAgeSeconds: 3600 }), /Max-Age=3600/);
  assert.match(serializeCookie("a", "b", { maxAgeSeconds: 0 }), /Max-Age=0/);
});
