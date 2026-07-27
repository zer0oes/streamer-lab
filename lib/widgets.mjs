import { existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LIBRARY_ROOT = join(ROOT, "library");
const LIBRARY_CATEGORY_DIRS = {
  widget: join(LIBRARY_ROOT, "widgets"),
  alert: join(LIBRARY_ROOT, "alerts")
};

function categoryDirectory(type) {
  return LIBRARY_CATEGORY_DIRS[type === "alert" ? "alert" : "widget"];
}

function widgetFromManifest(id, manifest, type) {
  return {
    id,
    name: manifest.name || id,
    description: manifest.description || "",
    icon: manifest.icon || "widgets",
    type: type === "alert" ? "alert" : "widget",
    archived: Boolean(manifest.archived),
    order: Number(manifest.order) || 100,
    createdAt: Number(manifest.createdAt) || null,
    updatedAt: Number(manifest.updatedAt) || null
  };
}

/**
 * Attribue des dates de creation/modification aux widgets crees avant
 * l'ajout de ce suivi, a partir des metadonnees du systeme de fichiers, et
 * les persiste dans le manifeste pour ne plus jamais avoir a refaire ce
 * calcul (le stat() du dossier est pris AVANT l'ecriture, sinon la
 * reecriture invaliderait le mtime qu'on vient de lire).
 */
async function ensureManifestDates(directory, manifestPath, manifest) {
  if (manifest.createdAt && manifest.updatedAt) return manifest;
  const stats = await stat(directory);
  const patched = {
    ...manifest,
    createdAt: manifest.createdAt || Math.round(stats.birthtimeMs) || Date.now(),
    updatedAt: manifest.updatedAt || Math.round(stats.mtimeMs) || Date.now()
  };
  await writeFile(manifestPath, `${JSON.stringify(patched, null, 2)}\n`, "utf8");
  return patched;
}

/** Marque un widget comme modifie maintenant, sans toucher au reste de son manifeste. */
async function bumpUpdatedAt(directory) {
  const manifestPath = join(directory, "widget.json");
  const manifest = await readJson(manifestPath);
  const updated = { ...manifest, updatedAt: Date.now() };
  await writeFile(manifestPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return updated;
}

async function listWidgets(categoryDirs = LIBRARY_CATEGORY_DIRS) {
  const widgets = [];

  for (const [type, categoryRoot] of Object.entries(categoryDirs)) {
    if (!existsSync(categoryRoot)) continue;
    const directories = await readdir(categoryRoot, { withFileTypes: true });

    for (const directory of directories) {
      if (!directory.isDirectory()) continue;
      const widgetDirectory = join(categoryRoot, directory.name);
      const manifestPath = join(widgetDirectory, "widget.json");
      if (!existsSync(manifestPath)) continue;
      const manifest = await ensureManifestDates(widgetDirectory, manifestPath, await readJson(manifestPath));
      widgets.push(widgetFromManifest(directory.name, manifest, type));
    }
  }

  return widgets.sort((left, right) =>
    left.order - right.order || left.name.localeCompare(right.name, "fr")
  );
}

async function getWidgetInfo(widgetId, categoryDirs = LIBRARY_CATEGORY_DIRS) {
  if (typeof widgetId !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(widgetId)) return null;

  for (const [type, categoryRoot] of Object.entries(categoryDirs)) {
    const directory = join(categoryRoot, widgetId);
    const manifestPath = join(directory, "widget.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = await ensureManifestDates(directory, manifestPath, await readJson(manifestPath));
    return { ...widgetFromManifest(widgetId, manifest, type), directory };
  }

  return null;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export {
  LIBRARY_ROOT,
  LIBRARY_CATEGORY_DIRS,
  categoryDirectory,
  widgetFromManifest,
  listWidgets,
  getWidgetInfo,
  ensureManifestDates,
  bumpUpdatedAt
};
