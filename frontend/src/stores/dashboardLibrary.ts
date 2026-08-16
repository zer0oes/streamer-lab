import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import type { SortMode } from "../lib/libraryFilter";

export type LibraryScope = "project" | "overlay" | "widget" | "alert";

export const DASHBOARD_PAGE_SIZE: Record<LibraryScope, number> = { project: 3, overlay: 3, widget: 5, alert: 5 };
// Pagination du dashboard uniquement (cf. MediaGrid.vue, prop `paginated`) :
// le panneau Médias complet de la sidebar reste une liste unique, comme
// avant la bascule Vue.
export const DASHBOARD_MEDIA_PAGE_SIZE = 6;

// Même clé que l'ancienne app (widget-lab-library-sort) : une préférence de
// tri déjà enregistrée par l'app vanilla reste valable après la bascule.
const SORT_STORAGE_KEY = "widget-lab-library-sort";

function loadStoredSortMode(): Record<LibraryScope, SortMode> {
  const defaults: Record<LibraryScope, SortMode> = { project: "name-asc", overlay: "name-asc", widget: "name-asc", alert: "name-asc" };
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
  const page = reactive<Record<LibraryScope, number>>({ project: 0, overlay: 0, widget: 0, alert: 0 });
  // Séparée de `page` (LibraryScope) : les médias n'ont ni recherche ni tri,
  // seulement une pagination sur le dashboard — pas la peine de forcer une
  // 4e clé "media" dans des types/objets qui, sinon, ne concernent que
  // overlay/widget/alert.
  const mediaPage = ref(0);

  function resetPages(): void {
    page.project = 0;
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

  function setMediaPage(value: number): void {
    mediaPage.value = value;
  }

  return { searchTerm, projectFilterId, sortMode, page, mediaPage, setSearchTerm, setProjectFilter, setSortMode, setPage, setMediaPage };
});
