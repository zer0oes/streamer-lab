import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MEDIA_ROOT = join(ROOT, "library", "media");
const MEDIA_URL_PREFIX = "/library-media/";

// Meme liste que MEDIA_URL_PATTERN cote client (extraction depuis les
// overlays StreamElements, cf. lib/streamelements.mjs) : un seul et meme
// ensemble de formats consideres comme "un media" partout dans l'app.
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const FILENAME_PATTERN = /^[a-z0-9-]+\.[a-z0-9]+$/;

function mediaType(extension) {
  return VIDEO_EXTENSIONS.has(extension) ? "video" : "image";
}

function sanitizeFileBase(originalName) {
  const ext = extname(originalName).toLowerCase();
  const base = basename(originalName, ext)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";
  return { base, ext };
}

async function fileEntry(fileName) {
  const info = await stat(join(MEDIA_ROOT, fileName));
  return {
    id: fileName,
    url: `${MEDIA_URL_PREFIX}${encodeURIComponent(fileName)}`,
    type: mediaType(extname(fileName).toLowerCase()),
    name: fileName,
    size: info.size,
    createdAt: info.birthtimeMs || info.ctimeMs
  };
}

/** Liste les medias uploades localement, les plus recents d'abord. */
export async function listLocalMedia() {
  if (!existsSync(MEDIA_ROOT)) return [];
  const entries = await readdir(MEDIA_ROOT, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase()));
  const results = await Promise.all(files.map((entry) => fileEntry(entry.name)));
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Enregistre un fichier uploade sous un nom assaini derive de son nom
 * d'origine (pas un id opaque) : le nom de fichier fait aussi office de nom
 * affiche, sans avoir besoin d'un manifeste separe juste pour ca.
 */
export async function saveLocalMedia(originalName, buffer) {
  if (buffer.length > MAX_MEDIA_BYTES) throw new Error("Fichier trop volumineux (25 Mo max)");
  const { base, ext } = sanitizeFileBase(originalName || "media");
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Type de fichier non autorise");
  await mkdir(MEDIA_ROOT, { recursive: true });
  let fileName = `${base}${ext}`;
  let counter = 1;
  while (existsSync(join(MEDIA_ROOT, fileName))) {
    fileName = `${base}-${counter}${ext}`;
    counter += 1;
  }
  await writeFile(join(MEDIA_ROOT, fileName), buffer);
  return fileEntry(fileName);
}

/** Supprime un media local par son id (= nom de fichier). */
export async function deleteLocalMedia(id) {
  if (typeof id !== "string" || !FILENAME_PATTERN.test(id)) return false;
  const filePath = join(MEDIA_ROOT, id);
  if (!existsSync(filePath)) return false;
  await rm(filePath);
  return true;
}

/** Resout un id de media local vers son chemin disque, ou null si absent/invalide. */
export function resolveLocalMediaPath(id) {
  if (typeof id !== "string" || !FILENAME_PATTERN.test(id)) return null;
  const filePath = join(MEDIA_ROOT, id);
  return existsSync(filePath) ? filePath : null;
}

export { MEDIA_ROOT, MEDIA_URL_PREFIX, MAX_MEDIA_BYTES };
