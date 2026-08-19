<script setup lang="ts">
import { computed } from "vue";
import type { LibraryEntry, OverlayEntry, Project } from "../api/types";
import { useDashboardLibraryStore, DASHBOARD_PAGE_SIZE, type LibraryScope } from "../stores/dashboardLibrary";
import { filterBySearch, paginate, sortEntries } from "../lib/libraryFilter";
import LibraryRow from "./LibraryRow.vue";
import ProjectLibraryRow from "./ProjectLibraryRow.vue";
import SortFilterMenu from "./SortFilterMenu.vue";
import OverlayPreviewThumb from "./OverlayPreviewThumb.vue";

const props = defineProps<{
  scope: LibraryScope;
  title: string;
  entries: (LibraryEntry | OverlayEntry | Project)[];
  emptyMessage: string;
  hint?: string;
}>();

const dashboardLibrary = useDashboardLibraryStore();
const rowKind = computed<"widget" | "overlay">(() => (props.scope === "overlay" ? "overlay" : "widget"));

const filtered = computed(() => {
  // Le filtre "projet" (menu déroulant à côté de la recherche) sélectionne
  // les overlays/widgets/alertes D'UN projet — n'a pas de sens appliqué à la
  // liste des projets elle-même (aucun d'eux n'a de `projectId` propre).
  const byProject =
    props.scope === "project" || !dashboardLibrary.projectFilterId
      ? props.entries
      : props.entries.filter((entry) => (entry as LibraryEntry | OverlayEntry).projectId === dashboardLibrary.projectFilterId);
  const bySearch = filterBySearch(byProject, dashboardLibrary.searchTerm);
  return sortEntries(bySearch, dashboardLibrary.sortMode[props.scope]);
});

const pagination = computed(() => paginate(filtered.value, dashboardLibrary.page[props.scope], DASHBOARD_PAGE_SIZE[props.scope]));

const emptyMessageResolved = computed(() =>
  dashboardLibrary.searchTerm.trim() ? `Aucun résultat pour « ${dashboardLibrary.searchTerm.trim()} ».` : props.emptyMessage
);

// Overlays et projets s'affichent en grille 3 colonnes ; widgets/alertes
// restent en liste simple. Overlays garde son propre bloc pleine largeur
// (.dashboard-view__overlays, qui porte aussi la marge Figma) plutôt que
// .dashboard-view__column, comme avant.
const outerClass = computed(() => (props.scope === "overlay" ? "dashboard-view__overlays" : "dashboard-view__column"));
const gridClass = computed(() => (props.scope === "overlay" || props.scope === "project" ? "dashboard-view__cards-grid" : ""));
</script>

<template>
  <div :class="outerClass">
    <div class="dashboard-view__column-header">
      <h4 class="dashboard-view__column-title">{{ title }}</h4>
      <div class="dashboard-view__column-actions">
        <slot name="actions" />
        <SortFilterMenu :scope="scope" :label="`Trier : ${title}`" />
      </div>
    </div>
    <p v-if="hint" class="dashboard-view__projects-hint">{{ hint }}</p>
    <div class="widget-library" :class="gridClass">
      <template v-if="scope === 'overlay'">
        <div v-for="entry in pagination.pageEntries" :key="entry.id" class="overlay-preview-card">
          <OverlayPreviewThumb :entry="(entry as OverlayEntry)" />
          <LibraryRow kind="overlay" :entry="(entry as OverlayEntry)" show-meta />
        </div>
      </template>
      <template v-else-if="scope === 'project'">
        <ProjectLibraryRow v-for="entry in pagination.pageEntries" :key="entry.id" :entry="(entry as Project)" />
      </template>
      <template v-else>
        <LibraryRow v-for="entry in pagination.pageEntries" :key="entry.id" :kind="rowKind" :entry="(entry as LibraryEntry)" show-meta />
      </template>
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
        <span class="material-symbols-sharp" aria-hidden="true">chevron_left</span>
      </button>
      <span class="library-pagination__label">{{ pagination.page + 1 }} / {{ pagination.pageCount }}</span>
      <button
        type="button"
        class="icon-button"
        aria-label="Page suivante"
        :disabled="pagination.page >= pagination.pageCount - 1"
        @click="dashboardLibrary.setPage(scope, pagination.page + 1)"
      >
        <span class="material-symbols-sharp" aria-hidden="true">chevron_right</span>
      </button>
    </div>
  </div>
</template>
