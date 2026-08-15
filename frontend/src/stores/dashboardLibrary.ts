import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import type { SortMode } from "../lib/libraryFilter";

export type LibraryScope = "overlay" | "widget" | "alert";

export const DASHBOARD_PAGE_SIZE: Record<LibraryScope, number> = { overlay: 3, widget: 5, alert: 5 };

// Même clé que l'ancienne app (widget-lab-library-sort) : une préférence de
// tri déjà enregistrée par l'app vanilla reste valable après la bascule.
const SORT_STORAGE_KEY = "widget-lab-library-sort";

function loadStoredSortMode(): Record<LibraryScope, SortMode> {
  const defaults: Record<LibraryScope, SortMode> = { overlay: "name-asc", widget: "name-asc", alert: "name-asc" };
  try {
    const stored = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) || "null");
    return stored && typeof stored === "object" ? { ...defaults, ...stored } : defaults;
  } catch {
    return defaults;
  }
}

export const useDashboardLibraryStore = defineStore("dashboardLibrary", () => {
  const searchTerm = ref("");
  const projectFilterId = ref("");
  const sortMode = reactive<Record<LibraryScope, SortMode>>(loadStoredSortMode());
  const page = reactive<Record<LibraryScope, number>>({ overlay: 0, widget: 0, alert: 0 });

  function resetPages(): void {
    page.overlay = 0;
    page.widget = 0;
    page.alert = 0;
  }

  function setSearchTerm(term: string): void {
    searchTerm.value = term;
    resetPages();
  }

  function setProjectFilter(projectId: string): void {
    projectFilterId.value = projectId;
    resetPages();
  }

  function setSortMode(scope: LibraryScope, mode: SortMode): void {
    sortMode[scope] = mode;
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortMode));
    page[scope] = 0;
  }

  function setPage(scope: LibraryScope, value: number): void {
    page[scope] = value;
  }

  return { searchTerm, projectFilterId, sortMode, page, setSearchTerm, setProjectFilter, setSortMode, setPage };
});
