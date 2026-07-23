import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";

const widgetRoot = new URL("../widget/", import.meta.url);
const requiredFiles = [
  "widget.json",
  "widget.html",
  "widget.css",
  "widget.streamelements.js",
  "fields.streamelements.json",
  "widget.streamlabs.js",
  "fields.streamlabs.json"
];

test("la bibliothèque contient tous les widgets avec leurs deux variantes", async () => {
  const entries = await readdir(widgetRoot, { withFileTypes: true });
  const widgetIds = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

  assert.deepEqual(widgetIds, [
    "zer0oes-animated-labels",
    "zer0oes-goal-bar",
    "zer0oes-in-game-labels",
    "zer0oes-neon-chat"
  ]);

  for (const widgetId of widgetIds) {
    const directory = new URL(`${widgetId}/`, widgetRoot);
    await Promise.all(requiredFiles.map(file => access(new URL(file, directory))));
    const manifest = JSON.parse(await readFile(new URL("widget.json", directory), "utf8"));
    assert.equal(manifest.id, widgetId);
    assert.ok(manifest.name);
  }
});
