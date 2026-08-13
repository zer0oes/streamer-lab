import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OVERLAYS_ROOT = join(ROOT, "library", "overlays");
const DEFAULT_CANVAS = { width: 1920, height: 1080 };
const ITEM_TYPES = new Set(["widget", "alert", "text", "image", "video", "embed", "icon", "shape", "group", "placeholder"]);
const PLACEHOLDER_SOURCE_TYPES = new Set(["video", "group", "alert-box", "native"]);
const REFERENCE_ITEM_TYPES = new Set(["widget", "alert"]);
const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3,8}$/i;
const ICON_NAME_PATTERN = /^[a-z0-9_]{1,64}$/i;
// Plancher commun a tous les items (widget/alert/texte/image/icone/forme et
// les enfants d'un groupe pendant un redimensionnement proportionnel) : une
// seule valeur cote client et serveur evite qu'un enfant retombe a une taille
// differente de celle affichee pendant le drag une fois persiste/recharge.
const MIN_ITEM_SIZE = 8;
const SOURCE_PLATFORMS = new Set(["streamelements", "streamlabs"]);

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
    // Champ frère de items/canvas, pas imbriqué dans canvas : updateOverlayMetadata
    // remplace canvas en entier à chaque renommage/redimensionnement de
    // l'overlay (voir son appel dans server.mjs), donc des guides nichés dedans
    // seraient perdus au premier "Modifier l'overlay" venu.
    guides: normalizeGuides(manifest.guides),
    // Renseignés uniquement pour un overlay importé (cf. import StreamElements
    // dans server.mjs) : sourcePlatform pilote le badge affiché sur la
    // vignette côté client, sourceOverlayId permet de retrouver l'overlay
    // local déjà importé pour un même overlay distant et le mettre à jour au
    // lieu d'en recréer un doublon.
    sourcePlatform: SOURCE_PLATFORMS.has(manifest.sourcePlatform) ? manifest.sourcePlatform : null,
    sourceOverlayId: typeof manifest.sourceOverlayId === "string" ? manifest.sourceOverlayId.slice(0, 200) : null,
    createdAt: Number(manifest.createdAt) || null,
    updatedAt: Number(manifest.updatedAt) || null
  };
}

function normalizeCanvas(canvas) {
  const width = Math.round(clampNumber(canvas?.width, 100, 7680, DEFAULT_CANVAS.width));
  const height = Math.round(clampNumber(canvas?.height, 100, 7680, DEFAULT_CANVAS.height));
  return { width, height };
}

// horizontal: distance depuis le haut (position d'une ligne horizontale) ;
// vertical: distance depuis la gauche — mêmes noms que les rubans Photoshop.
// Plafond de 60 par axe : un repère est trivial à recréer, pas la peine de
// blinder une limite haute exacte, juste d'éviter qu'un client buggé ne
// fasse gonfler overlay.json indéfiniment.
function normalizeGuides(guides) {
  const source = guides && typeof guides === "object" ? guides : {};
  const axis = (value) => Array.isArray(value)
    ? value
      .map((entry) => Math.round(clampNumber(entry, -20000, 20000, NaN)))
      .filter((entry) => Number.isFinite(entry))
      .slice(0, 60)
    : [];
  return { horizontal: axis(source.horizontal), vertical: axis(source.vertical) };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  const base = items
    .filter((item) => item && typeof item.id === "string" && ITEM_ID_PATTERN.test(item.id))
    .map((item) => {
      const type = ITEM_TYPES.has(item.type) ? item.type : "widget";
      if (REFERENCE_ITEM_TYPES.has(type) && !ITEM_ID_PATTERN.test(item.widgetId || "")) return null;
      return {
        id: item.id,
        type,
        ...(REFERENCE_ITEM_TYPES.has(type) ? { widgetId: item.widgetId } : {}),
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        w: Math.max(MIN_ITEM_SIZE, Number(item.w) || MIN_ITEM_SIZE),
        h: Math.max(MIN_ITEM_SIZE, Number(item.h) || MIN_ITEM_SIZE),
        z: Number(item.z) || 1,
        hidden: Boolean(item.hidden),
        locked: Boolean(item.locked),
        // Vide par défaut : le panneau des calques retombe alors sur un
        // libellé calculé (type/contenu/widget), cf. overlayLayerLabel côté
        // client — pas de valeur de repli ici, sinon un calque jamais
        // renommé afficherait ce repli au lieu de son vrai libellé calculé.
        name: typeof item.name === "string" ? item.name.trim().slice(0, 200) : "",
        // Ne s'applique qu'à un groupe (repliage du dossier dans le panneau
        // des calques), mais normalisé pour tous les types comme `hidden`
        // ci-dessus : plus simple qu'un champ conditionnel par type, et sans
        // effet pour un item qui l'ignore côté client.
        collapsed: Boolean(item.collapsed),
        props: normalizeItemProps(type, item.props)
      };
    })
    .filter(Boolean);

  // Un groupe ne peut referencer que des enfants qui existent reellement
  // dans ce meme overlay (jamais un item d'un autre overlay, jamais
  // lui-meme) : filtre apres coup, une fois la liste complete des ids valides connue.
  const ids = new Set(base.map((item) => item.id));
  for (const item of base) {
    if (item.type === "group") {
      item.props.children = item.props.children.filter((childId) => ids.has(childId) && childId !== item.id);
    }
  }
  return base;
}

function normalizeItemProps(type, props) {
  const source = props && typeof props === "object" ? props : {};
  switch (type) {
    case "text":
      return {
        content: clampString(source.content, 500, "Texte"),
        fontFamily: clampString(source.fontFamily, 80, "inherit"),
        fontSize: clampNumber(source.fontSize, 6, 400, 32),
        fontWeight: [400, 500, 600, 700, 800, 900].includes(Number(source.fontWeight)) ? Number(source.fontWeight) : 600,
        letterSpacing: clampNumber(source.letterSpacing, -20, 100, 0),
        lineHeight: clampNumber(source.lineHeight, 0.5, 4, 1.2),
        align: ["left", "center", "right"].includes(source.align) ? source.align : "left",
        // colorMode bascule laquelle de color / gradientFrom+gradientTo+gradientAngle
        // s'applique réellement (cf. applyOverlayTextStyle côté client) — les deux
        // jeux de valeurs restent toujours normalisés/stockés, seul le mode actif compte.
        colorMode: source.colorMode === "gradient" ? "gradient" : "solid",
        color: normalizeColor(source.color, "#ffffff"),
        gradientFrom: normalizeColor(source.gradientFrom, "#8138ff"),
        gradientTo: normalizeColor(source.gradientTo, "#ff4d8d"),
        gradientAngle: clampNumber(source.gradientAngle, 0, 360, 90),
        shadowEnabled: Boolean(source.shadowEnabled),
        shadowColor: normalizeColor(source.shadowColor, "#000000"),
        shadowBlur: clampNumber(source.shadowBlur, 0, 100, 8),
        shadowOffsetX: clampNumber(source.shadowOffsetX, -100, 100, 0),
        shadowOffsetY: clampNumber(source.shadowOffsetY, -100, 100, 4),
        strokeEnabled: Boolean(source.strokeEnabled),
        strokeColor: normalizeColor(source.strokeColor, "#000000"),
        strokeWidth: clampNumber(source.strokeWidth, 0, 20, 1)
      };
    case "image":
      return {
        src: normalizeUrl(source.src),
        fit: ["cover", "contain", "fill"].includes(source.fit) ? source.fit : "cover"
      };
    case "video":
      return {
        src: normalizeUrl(source.src),
        fit: ["cover", "contain", "fill"].includes(source.fit) ? source.fit : "cover",
        loop: source.loop !== false,
        muted: source.muted !== false
      };
    case "embed":
      return { src: normalizeUrl(source.src) };
    case "icon":
      return {
        name: ICON_NAME_PATTERN.test(source.name || "") ? source.name : "star",
        color: normalizeColor(source.color, "#ffffff")
      };
    case "shape":
      return {
        shape: source.shape === "ellipse" ? "ellipse" : "rectangle",
        fill: normalizeColor(source.fill, "#7c5cff"),
        stroke: normalizeColor(source.stroke, "transparent"),
        strokeWidth: clampNumber(source.strokeWidth, 0, 40, 0),
        radius: clampNumber(source.radius, 0, 500, 0)
      };
    case "group":
      return {
        children: Array.isArray(source.children)
          ? source.children.filter((childId) => typeof childId === "string").slice(0, 200)
          : []
      };
    case "widget":
    case "alert":
      return { fieldData: normalizeFieldData(source.fieldData) };
    case "placeholder":
      return { sourceType: PLACEHOLDER_SOURCE_TYPES.has(source.sourceType) ? source.sourceType : "native" };
    default:
      return {};
  }
}

function normalizeFieldData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  let count = 0;
  for (const [key, val] of Object.entries(value)) {
    if (count >= 100) break;
    if (typeof key !== "string" || key.length > 100) continue;
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (val !== null && !["string", "number", "boolean"].includes(typeof val)) continue;
    result[key] = typeof val === "string" ? val.slice(0, 5000) : val;
    count++;
  }
  return result;
}

function normalizeColor(value, fallback) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value.trim()) ? value.trim() : fallback;
}

function clampString(value, max, fallback) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

// data: est volontairement refuse (pas seulement http/https) : sans ca, un
// client pourrait coller une image (ou une vidéo) encodee en base64 dans le
// prompt "URL" et faire gonfler overlay.json (un fichier JSON pense pour
// rester lisible a la main) alors que la consigne produit est "URL
// uniquement, pas d'upload" — vaut pour image/video/embed, d'où le nom générique.
function normalizeUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
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

async function createOverlay({ name, description, icon, id, canvas, sourcePlatform, sourceOverlayId }) {
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
    canvas: normalizeCanvas(canvas),
    items: [],
    guides: { horizontal: [], vertical: [] },
    sourcePlatform: SOURCE_PLATFORMS.has(sourcePlatform) ? sourcePlatform : null,
    sourceOverlayId: typeof sourceOverlayId === "string" ? sourceOverlayId.slice(0, 200) : null,
    createdAt: now,
    updatedAt: now
  };
  const directory = join(OVERLAYS_ROOT, id);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "overlay.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return overlayFromManifest(id, manifest);
}

async function updateOverlayMetadata(overlayId, { name, description, icon, canvas }) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return null;
  const manifestPath = join(overlayInfo.directory, "overlay.json");
  const manifest = await readJson(manifestPath);
  const updated = { ...manifest, name, description, icon, canvas: normalizeCanvas(canvas), updatedAt: Date.now() };
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

async function replaceOverlayGuides(overlayId, guides) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return null;
  const manifestPath = join(overlayInfo.directory, "overlay.json");
  const manifest = await readJson(manifestPath);
  const updated = { ...manifest, guides: normalizeGuides(guides), updatedAt: Date.now() };
  await writeFile(manifestPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return overlayFromManifest(overlayId, updated);
}

async function deleteOverlay(overlayId) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return false;
  await rm(overlayInfo.directory, { recursive: true, force: true });
  return true;
}

// L'id/nom uniques sont calculés côté serveur (server.mjs, via slugify +
// uniqueWidgetId, déjà utilisés pour la création d'overlay) et passés ici :
// ce module n'a pas connaissance de ces helpers de nommage.
async function duplicateOverlay(overlayId, newId, newName) {
  const overlayInfo = await getOverlayInfo(overlayId);
  if (!overlayInfo) return null;
  const manifest = await readJson(join(overlayInfo.directory, "overlay.json"));
  const overlays = await listOverlays();
  const order = overlays.reduce((max, entry) => Math.max(max, entry.order), 0) + 10;
  const now = Date.now();
  const duplicated = {
    ...manifest,
    id: newId,
    name: newName,
    order,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
  const directory = join(OVERLAYS_ROOT, newId);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "overlay.json"), `${JSON.stringify(duplicated, null, 2)}\n`, "utf8");
  return overlayFromManifest(newId, duplicated);
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
  replaceOverlayGuides,
  deleteOverlay,
  duplicateOverlay
};
