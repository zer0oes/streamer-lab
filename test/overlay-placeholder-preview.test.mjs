import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlaceholderPreview } from "../lib/overlays.mjs";

test("normalizePlaceholderPreview garde le code et les valeurs d'un Custom Widget importe", () => {
  const preview = normalizePlaceholderPreview({ kind: "code", html: "<div>goal</div>", css: ".goal{}", js: "1;", fieldData: { color: "#fff", nested: { a: 1 } } });
  assert.deepEqual(preview, { kind: "code", html: "<div>goal</div>", css: ".goal{}", js: "1;", fieldData: { color: "#fff" } });
});

test("normalizePlaceholderPreview garde une image/video http(s), refuse le reste", () => {
  assert.deepEqual(normalizePlaceholderPreview({ kind: "image", src: "https://cdn.example.com/a.png" }), { kind: "image", src: "https://cdn.example.com/a.png" });
  assert.equal(normalizePlaceholderPreview({ kind: "video", src: "javascript:alert(1)" }), null);
  assert.equal(normalizePlaceholderPreview({ kind: "embed", src: "https://example.com" }), null);
  assert.equal(normalizePlaceholderPreview(undefined), null);
});

test("normalizePlaceholderPreview abandonne un code trop volumineux plutot que de le tronquer", () => {
  assert.equal(normalizePlaceholderPreview({ kind: "code", html: "x".repeat(300_001), css: "", js: "" }), null);
});
