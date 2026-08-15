import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { listAllWidgetDirectories } from "./helpers/library-paths.mjs";

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
  const directories = await listAllWidgetDirectories();

  for (const directory of directories) {
    const widgetId = basename(directory);
    await Promise.all(requiredFiles.map(file => access(join(directory, file))));
    const manifest = JSON.parse(await readFile(join(directory, "widget.json"), "utf8"));
    assert.equal(manifest.id, widgetId);
    assert.ok(manifest.name);
  }

  assert.ok(directories.length > 0, "aucun widget trouvé");
});
