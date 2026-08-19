<script setup lang="ts">
import { computed } from "vue";
import { useDashboardLibraryStore } from "../stores/dashboardLibrary";
import { useLibraryStore } from "../stores/library";
import DashboardProjectFilter from "./DashboardProjectFilter.vue";

const dashboardLibrary = useDashboardLibraryStore();
const libraryStore = useLibraryStore();

const suggestions = computed(() => {
  const names = new Set([...libraryStore.widgets, ...libraryStore.overlays].map((entry) => entry.name));
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
});

function onInput(event: Event): void {
  dashboardLibrary.setSearchTerm((event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="dashboard-view__search-row">
    <label class="dashboard-view__search" for="dashboard-library-search">
      <span class="material-symbols-sharp" aria-hidden="true">search</span>
      <input
        id="dashboard-library-search"
        type="search"
        list="dashboard-library-suggestions"
        placeholder="Rechercher un widget, une alerte ou un overlay…"
        autocomplete="off"
        :value="dashboardLibrary.searchTerm"
        @input="onInput"
      />
    </label>
    <DashboardProjectFilter />
    <datalist id="dashboard-library-suggestions">
      <option v-for="name in suggestions" :key="name" :value="name" />
    </datalist>
  </div>
</template>
