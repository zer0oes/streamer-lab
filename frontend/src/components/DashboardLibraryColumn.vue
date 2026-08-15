<script setup lang="ts">
import { computed } from "vue";
import type { LibraryEntry, OverlayEntry } from "../api/types";
import { useDashboardLibraryStore, DASHBOARD_PAGE_SIZE, type LibraryScope } from "../stores/dashboardLibrary";
import { filterBySearch, paginate, sortEntries } from "../lib/libraryFilter";
import LibraryRow from "./LibraryRow.vue";
import SortFilterMenu from "./SortFilterMenu.vue";

const props = defineProps<{
  scope: LibraryScope;
  title: string;
  entries: (LibraryEntry | OverlayEntry)[];
  emptyMessage: string;
}>();

const dashboardLibrary = useDashboardLibraryStore();
const rowKind = computed<"widget" | "overlay">(() => (props.scope === "overlay" ? "overlay" : "widget"));

const filtered = computed(() => {
  const byProject = dashboardLibrary.projectFilterId
    ? props.entries.filter((entry) => entry.projectId === dashboardLibrary.projectFilterId)
    : props.entries;
  const bySearch = filterBySearch(byProject, dashboardLibrary.searchTerm);
  return sortEntries(bySearch, dashboardLibrary.sortMode[props.scope]);
});

const pagination = computed(() => paginate(filtered.value, dashboardLibrary.page[props.scope], DASHBOARD_PAGE_SIZE[props.scope]));

const emptyMessageResolved = computed(() =>
  dashboardLibrary.searchTerm.trim() ? `Aucun résultat pour « ${dashboardLibrary.searchTerm.trim()} ».` : props.emptyMessage
);

// Les overlays s'affichent en grille 3 colonnes dans leur propre bloc
// pleine largeur (.dashboard-view__overlays) ; widgets/alertes restent en
// liste simple, côte à côte dans .dashboard-view__group-columns (posé par
// le parent DashboardView).
const outerClass = computed(() => (props.scope === "overlay" ? "dashboard-view__overlays" : "dashboard-view__column"));
const gridClass = computed(() => (props.scope === "overlay" ? "dashboard-view__overlays-grid" : ""));
</script>

<template>
  <div :class="outerClass">
    <div class="dashboard-view__column-header">
      <h4 class="dashboard-view__column-title">{{ title }}</h4>
      <slot name="actions" />
      <SortFilterMenu :scope="scope" :label="`Trier : ${title}`" />
    </div>
    <div class="widget-library" :class="gridClass">
      <LibraryRow v-for="entry in pagination.pageEntries" :key="entry.id" :kind="rowKind" :entry="entry" show-meta />
      <p v-if="!pagination.pageEntries.length" class="widget-library__empty">{{ emptyMessageResolved }}</p>
    </div>
    <div class="library-pagination" :hidden="pagination.pageCount <= 1">
      <button
        type="button"
        class="icon-button"
        aria-label="Page précédente"
        :disabled="pagination.page <= 0"
        @click="dashboardLibrary.setPage(scope, pagination.page - 1)"
      >
        <span class="material-symbols-rounded" aria-hidden="true">chevron_left</span>
      </button>
      <span class="library-pagination__label">{{ pagination.page + 1 }} / {{ pagination.pageCount }}</span>
      <button
        type="button"
        class="icon-button"
        aria-label="Page suivante"
        :disabled="pagination.page >= pagination.pageCount - 1"
        @click="dashboardLibrary.setPage(scope, pagination.page + 1)"
      >
        <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
      </button>
    </div>
  </div>
</template>
