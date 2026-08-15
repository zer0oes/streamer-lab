import { existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LIBRARY_ROOT = join(ROOT, "library");

// Chaque projet a son propre widgets/ et alerts/ (library/<projectId>/widgets,
// library/<projectId>/alerts) : ce helper calcule ces deux chemins, a passer
// en categoryDirs a listWidgets/getWidgetInfo ci-dessous (elles restent
// agnostiques du concept de projet, cf. test/widgets.test.mjs qui injecte ses
// propres categoryDirs sans jamais passer par un projectId).
function categoryDirsForProject(projectId) {
  const projectRoot = join(LIBRARY_ROOT, projectId);
  return {
    widget: join(projectRoot, "widgets"),
    alert: join(projectRoot, "alerts")
  };
}

function categoryDirectory(projectId, type) {
  return categoryDirsForProject(projectId)[type === "alert" ? "alert" : "widget"];
}

// Repli 320x180 pour les manifestes crees avant l'ajout de la taille par
// defaut : meme valeur que l'ancien placement en dur cote client
// (addOverlayItem), pour ne rien faire bouger retroactivement.
function widgetFromManifest(id, manifest, type) {
  return {
    id,
    name: manifest.name || id,
    description: manifest.description || "",
    icon: manifest.icon || "widgets",
    type: type === "alert" ? "alert" : "widget",
    archived: Boolean(manifest.archived),
    order: Number(manifest.order) || 100,
    width: Number(manifest.width) || 320,
    height: Number(manifest.height) || 180,
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

async function listWidgets(categoryDirs) {
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

async function getWidgetInfo(widgetId, categoryDirs) {
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
  categoryDirsForProject,
  categoryDirectory,
  widgetFromManifest,
  listWidgets,
  getWidgetInfo,
  ensureManifestDates,
  bumpUpdatedAt
};
