import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { listAllWidgetDirectories } from "./helpers/library-paths.mjs";
import { ALERTBOX_CODE_FILES, ALERTBOX_TYPES_BY_PLATFORM, alertboxDir } from "../lib/widgets.mjs";

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

// AlertBox : pour StreamElements (racine) et Streamlabs (streamlabs/), les
// réglages natifs puis le code complet de chaque alerte dans son sous-dossier
const requiredAlertboxFiles = [
  "widget.json",
  ...Object.entries(ALERTBOX_TYPES_BY_PLATFORM).flatMap(([platform, types]) => [
    `${alertboxDir(platform)}alertbox.json`,
    ...types.flatMap(type => Object.values(ALERTBOX_CODE_FILES).map(file => `${alertboxDir(platform)}${type}/${file}`))
  ])
];

test("la bibliothèque contient tous les widgets avec leurs deux variantes", async () => {
  const directories = await listAllWidgetDirectories();

  for (const directory of directories) {
    const widgetId = basename(directory);
    const manifest = JSON.parse(await readFile(join(directory, "widget.json"), "utf8"));
    const files = manifest.kind === "alertbox" ? requiredAlertboxFiles : requiredFiles;
    await Promise.all(files.map(file => access(join(directory, file))));
    if (manifest.kind === "alertbox") {
      for (const config of ["alertbox.json", "streamlabs/alertbox.json"]) {
        assert.doesNotThrow(() => JSON.parse(readFileSync(join(directory, config), "utf8")));
      }
    }
    assert.equal(manifest.id, widgetId);
    assert.ok(manifest.name);
  }

  assert.ok(directories.length > 0, "aucun widget trouvé");
});
