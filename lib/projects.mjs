import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LIBRARY_ROOT } from "./widgets.mjs";

const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
// "media" est un dossier partage entre tous les projets (lib/media.mjs) ;
// overlays/widgets/alerts sont les noms de l'ancien layout plat que la
// migration detecte a la racine de library/ (cf. migrateLegacyLibrary) -
// reserver ces ids evite qu'un projet nomme ainsi ne soit confondu avec ce
// marqueur au prochain demarrage.
const RESERVED_PROJECT_IDS = new Set(["media", "overlays", "widgets", "alerts"]);
const LEGACY_LIBRARY_DIRS = ["overlays", "widgets", "alerts"];
const DEFAULT_PROJECT_ID = "principal";
const DEFAULT_PROJECT_NAME = "Bibliotheque principale";

function projectFromManifest(id, manifest) {
  return {
    id,
    name: manifest.name || id,
    description: manifest.description || "",
    icon: manifest.icon || "folder",
    archived: Boolean(manifest.archived),
    order: Number(manifest.order) || 100,
    createdAt: Number(manifest.createdAt) || null,
    updatedAt: Number(manifest.updatedAt) || null
  };
}

// `root` (par defaut LIBRARY_ROOT, le vrai dossier library/ du projet) est
// injectable pour les tests, meme principe que categoryDirs dans
// lib/widgets.mjs : permet de pointer vers un dossier temporaire sans jamais
// toucher la vraie bibliotheque de l'utilisateur pendant `npm test`.
async function listProjects(root = LIBRARY_ROOT) {
  if (!existsSync(root)) return [];
  const projects = [];
  const directories = await readdir(root, { withFileTypes: true });

  for (const directory of directories) {
    if (!directory.isDirectory() || RESERVED_PROJECT_IDS.has(directory.name)) continue;
    const projectDirectory = join(root, directory.name);
    const manifestPath = join(projectDirectory, "project.json");
    if (!existsSync(manifestPath)) continue;
    projects.push(projectFromManifest(directory.name, await readJson(manifestPath)));
  }

  return projects.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "fr"));
}

async function getProjectInfo(projectId, root = LIBRARY_ROOT) {
  if (typeof projectId !== "string" || !PROJECT_ID_PATTERN.test(projectId) || RESERVED_PROJECT_IDS.has(projectId)) {
    return null;
  }
  const directory = join(root, projectId);
  const manifestPath = join(directory, "project.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = await readJson(manifestPath);
  return { ...projectFromManifest(projectId, manifest), directory };
}

async function createProject({ id, name, description, icon }, root = LIBRARY_ROOT) {
  const now = Date.now();
  const projects = await listProjects(root);
  const order = projects.reduce((max, entry) => Math.max(max, entry.order), 0) + 10;
  const manifest = { id, name, description, icon, order, archived: false, createdAt: now, updatedAt: now };
  const directory = join(root, id);
  await mkdir(join(directory, "overlays"), { recursive: true });
  await mkdir(join(directory, "widgets"), { recursive: true });
  await mkdir(join(directory, "alerts"), { recursive: true });
  await writeFile(join(directory, "project.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return projectFromManifest(id, manifest);
}

async function updateProjectMetadata(projectId, { name, description, icon }, root = LIBRARY_ROOT) {
  const projectInfo = await getProjectInfo(projectId, root);
  if (!projectInfo) return null;
  const manifestPath = join(projectInfo.directory, "project.json");
  const manifest = await readJson(manifestPath);
  const updated = { ...manifest, name, description, icon, updatedAt: Date.now() };
  await writeFile(manifestPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return projectFromManifest(projectId, updated);
}

async function deleteProject(projectId, root = LIBRARY_ROOT) {
  const projectInfo = await getProjectInfo(projectId, root);
  if (!projectInfo) return false;
  await rm(projectInfo.directory, { recursive: true, force: true });
  return true;
}

/**
 * Deplace l'ancien layout plat (library/overlays|widgets|alerts a la racine)
 * dans un projet par defaut library/principal/, une seule fois. Idempotent :
 * une fois les 3 dossiers deplaces, plus rien ne declenche la migration au
 * prochain demarrage.
 */
async function migrateLegacyLibrary(root = LIBRARY_ROOT) {
  const legacyDirs = LEGACY_LIBRARY_DIRS.filter((name) => existsSync(join(root, name)));
  if (legacyDirs.length === 0) return;

  const targetDirectory = join(root, DEFAULT_PROJECT_ID);
  await mkdir(targetDirectory, { recursive: true });
  const now = Date.now();
  const manifest = {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    description: "",
    icon: "folder",
    order: 10,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
  await writeFile(join(targetDirectory, "project.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  for (const name of legacyDirs) {
    await rename(join(root, name), join(targetDirectory, name));
  }

  console.log(`[migration] Bibliotheque existante deplacee dans library/${DEFAULT_PROJECT_ID}/`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export {
  RESERVED_PROJECT_IDS,
  DEFAULT_PROJECT_ID,
  listProjects,
  getProjectInfo,
  createProject,
  updateProjectMetadata,
  deleteProject,
  migrateLegacyLibrary
};
