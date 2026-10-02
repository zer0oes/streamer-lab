import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl } from "../lib/overlays.mjs";

test("normalizeUrl accepte les URL http(s) et les médias locaux", () => {
  assert.equal(normalizeUrl("https://cdn.example.com/fond.webm"), "https://cdn.example.com/fond.webm");
  assert.equal(normalizeUrl("/library-media/tomavega-starting-screen-fond.jpg"), "/library-media/tomavega-starting-screen-fond.jpg");
});

test("normalizeUrl refuse le reste (data:, javascript:, chemins arbitraires)", () => {
  assert.equal(normalizeUrl("data:image/png;base64,AAAA"), "");
  assert.equal(normalizeUrl("javascript:alert(1)"), "");
  assert.equal(normalizeUrl("/library-media/../server.mjs"), "");
  assert.equal(normalizeUrl("/api/state"), "");
  assert.equal(normalizeUrl("/library-media/Fond Final.JPG"), "");
});
