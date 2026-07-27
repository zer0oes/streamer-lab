import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "sass";
import { fileURLToPath } from "node:url";

test("styles/main.scss compile sans erreur et produit du CSS", () => {
  const entry = fileURLToPath(new URL("../styles/main.scss", import.meta.url));
  const result = compile(entry);
  assert.ok(result.css.length > 0, "la sortie compilee ne doit pas etre vide");
  assert.match(result.css, /:root/, "le bloc de tokens doit etre present");
});
