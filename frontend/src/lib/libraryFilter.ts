// Port des fonctions pures filterAndSortLibraryEntries / paginateDashboardEntries
// de l'ancienne app.js — logique de recherche/tri/pagination du dashboard,
// jusqu'ici jamais testée malgré son usage sur les 3 colonnes (overlays/
// widgets/alertes).

export type SortMode = "name-asc" | "name-desc" | "updated-desc" | "updated-asc" | "created-desc" | "created-asc";

export const SORT_MODE_LABELS: [SortMode, string][] = [
  ["name-asc", "Nom (A→Z)"],
  ["name-desc", "Nom (Z→A)"],
  ["updated-desc", "Modifié (récent d'abord)"],
  ["updated-asc", "Modifié (ancien d'abord)"],
  ["created-desc", "Créé (récent d'abord)"],
  ["created-asc", "Créé (ancien d'abord)"]
];

export interface SearchableEntry {
  name: string;
  description?: string;
}

export interface SortableEntry {
  name: string;
  updatedAt: number | null;
  createdAt: number | null;
}

export function filterBySearch<T extends SearchableEntry>(entries: T[], term: string): T[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return entries;
  return entries.filter(
    (entry) => entry.name.toLowerCase().includes(normalized) || (entry.description || "").toLowerCase().includes(normalized)
  );
}

export function sortEntries<T extends SortableEntry>(entries: T[], mode: SortMode): T[] {
  const byName = (a: T, b: T): number => a.name.localeCompare(b.name, "fr");
  const sorters: Record<SortMode, (a: T, b: T) => number> = {
    "name-asc": byName,
    "name-desc": (a, b) => -byName(a, b),
    "updated-asc": (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
    "updated-desc": (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    "created-asc": (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
    "created-desc": (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  };
  return [...entries].sort(sorters[mode] ?? byName);
}

export interface PaginationResult<T> {
  pageEntries: T[];
  pageCount: number;
  page: number;
}

/** Découpe `entries` à `page` (0-indexé) ; recale la page si elle est hors bornes. */
export function paginate<T>(entries: T[], page: number, pageSize: number): PaginationResult<T> {
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const clampedPage = Math.min(Math.max(page, 0), pageCount - 1);
  const start = clampedPage * pageSize;
  return { pageEntries: entries.slice(start, start + pageSize), pageCount, page: clampedPage };
}
