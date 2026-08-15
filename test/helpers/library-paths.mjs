import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LIBRARY_ROOT = fileURLToPath(new URL("../../library/", import.meta.url));
const RESERVED_PROJECT_DIRS = new Set(["media"]);
const WIDGET_CATEGORIES = ["widgets", "alerts"];

async function projectDirectoryNames() {
  if (!existsSync(LIBRARY_ROOT)) return [];
  const entries = await readdir(LIBRARY_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !RESERVED_PROJECT_DIRS.has(entry.name))
    .map((entry) => entry.name);
}

/**
 * Localise le dossier d'un widget/alerte quel que soit son projet courant :
 * les tests ne doivent jamais supposer qu'un widget reste dans un projet
 * donne, puisque l'utilisateur peut le deplacer entre projets depuis
 * l'application (glisser-depose ou dialogue d'edition, cf. PUT
 * /api/widget/project cote serveur).
 */
export async function findWidgetDirectory(widgetId) {
  for (const project of await projectDirectoryNames()) {
    for (const category of WIDGET_CATEGORIES) {
      const candidate = join(LIBRARY_ROOT, project, category, widgetId);
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(`Widget introuvable dans aucun projet : ${widgetId}`);
}

/** Liste les dossiers de tous les widgets/alertes, tous projets confondus. */
export async function listAllWidgetDirectories() {
  const directories = [];
  for (const project of await projectDirectoryNames()) {
    for (const category of WIDGET_CATEGORIES) {
      const categoryRoot = join(LIBRARY_ROOT, project, category);
      if (!existsSync(categoryRoot)) continue;
      const entries = await readdir(categoryRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) directories.push(join(categoryRoot, entry.name));
      }
    }
  }
  return directories;
}
