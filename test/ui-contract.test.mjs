import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("le HTML expose les éléments requis par les mises à jour dynamiques", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

  for (const id of [
    "account-fab",
    "account-panel",
    "editor-status",
    "widget-list",
    "fields-form",
    "widget-settings-dialog",
    "widget-settings-form",
    "widget-settings-message"
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `Élément #${id} absent`);
  }
});
