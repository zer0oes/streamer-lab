import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OVERLAYS_ROOT = join(ROOT, "library", "overlays");
const DEFAULT_CANVAS = { width: 1920, height: 1080 };
const ITEM_TYPES = new Set(["widget", "alert"]);

function overlayFromManifest(id, manifest) {
  return {
    id,
    name: manifest.name || id,
    description: manifest.description || "",
    icon: manifest.icon || "desktop_landscape",
    archived: Boolean(manifest.archived),
    order: Number(manifest.order) || 100,
    canvas: normalizeCanvas(manifest.canvas),
    items: normalizeItems(manifest.items),
    createdAt: Number(manifest.createdAt) || null,
    updatedAt: Number(manifest.updatedAt) || null
  };
}

function normalizeCanvas(canvas) {
  const width = Number(canvas?.width) || DEFAULT_CANVAS.width;
  const height = Number(canvas?.height) || DEFAULT_CANVAS.height;
  return { width, height };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(item.widgetId || ""))
    .map((item) => ({
      id: item.id,
      widgetId: item.widgetId,
      type: ITEM_TYPES.has(item.type) ? item.type : "widget",
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      w: Math.max(20, Number(item.w) || 20),
      h: Math.max(20, Number(item.h) || 20),
      z: Number(item.z) || 1
    }));
}

/**
 * Attribue des dates de creation/modification aux overlays crees avant
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

async function listOverlays() {
  if (!existsSync(OVERLAYS_ROOT)) return [];
  const overlays = [];
  const directories = await readdir(OVERLAYS_ROOT, { withFileTypes: true });

  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const overlayDirectory = join(OVERLAYS_ROOT, directory.name);
    const manifestPath = join(overlayDirectory, "overlay.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = await ensureManifestDates(overlayDirectory, manifestPath, await readJson(manifestPath));
    overlays.push(overlayFromManifest(directory.name, manifest));
  }

  return overlays.sort((left, right) =>
    left.order - right.order || left.name.localeCompare(right.name, "fr")
  );
}

async function getOverlayInfo(overlayId) {
  if (typeof overlayId !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(overlayId)) return null;
  const directory = join(OVERLAYS_ROOT, overlayId);
  const manifestPath = join(directory, "overlay.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = await ensureManifestDates(directory, manifestPath, await readJson(manifestPath));
  return { ...overlayFromManifest(overlayId, manifest), directory };
}

async function createOverlay({ name, description, icon, id }) {
  const now = Date.now();
  const overlays = await listOverlays();
  const order = overlays.reduce((max, entry) => Math.max(max, entry.order), 0) + 10;
  const manifest = {
    id,
    name,
    description,
    icon,
    order,
    archived: false,
    canvas: DEFAULT_CANVAS,
    items: [],
    createdAt: now,
    updatedAt: now
  };
  const directory = join(OVERLAYS_ROOT, id);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "overlay.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return overlayFromManifest(id, manifest);
}

async function updateOverlayMetadata(overlayId, { name, description, icon }) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return null;
  const manifestPath = join(overlayInfo.directory, "overlay.json");
  const manifest = await readJson(manifestPath);
  const updated = { ...manifest, name, description, icon, updatedAt: Date.now() };
  await writeFile(manifestPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return overlayFromManifest(overlayId, updated);
}

async function replaceOverlayItems(overlayId, items) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return null;
  const manifestPath = join(overlayInfo.directory, "overlay.json");
  const manifest = await readJson(manifestPath);
  const updated = { ...manifest, items: normalizeItems(items), updatedAt: Date.now() };
  await writeFile(manifestPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return overlayFromManifest(overlayId, updated);
}

async function deleteOverlay(overlayId) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return false;
  await rm(overlayInfo.directory, { recursive: true, force: true });
  return true;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export {
  OVERLAYS_ROOT,
  listOverlays,
  getOverlayInfo,
  createOverlay,
  updateOverlayMetadata,
  replaceOverlayItems,
  deleteOverlay
};
