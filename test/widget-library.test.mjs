import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";

const categoryRoots = [
  new URL("../library/widgets/", import.meta.url),
  new URL("../library/alerts/", import.meta.url)
];
const requiredFiles = [
  "widget.json",
  "widget.html",
  "widget.css",
  "widget.streamelements.js",
  "fields.streamelements.json",
  "widget.streamlabs.js",
  "fields.streamlabs.json",
  "data.streamelements.json",
  "data.streamlabs.json"
];

test("la bibliothèque contient tous les widgets avec leurs deux variantes", async () => {
  let totalWidgets = 0;

  for (const categoryRoot of categoryRoots) {
    const entries = await readdir(categoryRoot, { withFileTypes: true });
    const widgetIds = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    totalWidgets += widgetIds.length;

    for (const widgetId of widgetIds) {
      const directory = new URL(`${widgetId}/`, categoryRoot);
      await Promise.all(requiredFiles.map(file => access(new URL(file, directory))));
      const manifest = JSON.parse(await readFile(new URL("widget.json", directory), "utf8"));
      assert.equal(manifest.id, widgetId);
      assert.ok(manifest.name);
    }
  }

  assert.ok(totalWidgets > 0, "aucun widget trouvé");
});
