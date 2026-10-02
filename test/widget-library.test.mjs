import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { listAllWidgetDirectories } from "./helpers/library-paths.mjs";
import { ALERTBOX_CODE_FILES, ALERTBOX_TYPES } from "../lib/widgets.mjs";

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

// AlertBox (custom CSS, StreamElements uniquement) : réglages natifs, puis le
// code complet de chaque alerte dans son sous-dossier
const requiredAlertboxFiles = [
  "widget.json",
  "alertbox.json",
  ...ALERTBOX_TYPES.flatMap(type => Object.values(ALERTBOX_CODE_FILES).map(file => `${type}/${file}`))
];

test("la bibliothèque contient tous les widgets avec leurs deux variantes", async () => {
  const directories = await listAllWidgetDirectories();

  for (const directory of directories) {
    const widgetId = basename(directory);
    const manifest = JSON.parse(await readFile(join(directory, "widget.json"), "utf8"));
    const files = manifest.kind === "alertbox" ? requiredAlertboxFiles : requiredFiles;
    await Promise.all(files.map(file => access(join(directory, file))));
    if (manifest.kind === "alertbox") {
      assert.doesNotThrow(() => JSON.parse(readFileSync(join(directory, "alertbox.json"), "utf8")));
    }
    assert.equal(manifest.id, widgetId);
    assert.ok(manifest.name);
  }

  assert.ok(directories.length > 0, "aucun widget trouvé");
});
