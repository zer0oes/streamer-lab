<script setup lang="ts">
import { useDashboardLibraryStore, type LibraryScope } from "../stores/dashboardLibrary";
import { useDropdownToggle } from "../composables/useDropdownToggle";
import { SORT_MODE_LABELS, type SortMode } from "../lib/libraryFilter";

const props = defineProps<{
  scope: LibraryScope;
  label: string;
}>();

const dashboardLibrary = useDashboardLibraryStore();
const { open, containerEl, toggle, close } = useDropdownToggle();

function select(mode: SortMode): void {
  dashboardLibrary.setSortMode(props.scope, mode);
  close();
}
</script>

<template>
  <div ref="containerEl" style="position: relative">
    <button
      type="button"
      class="icon-button dashboard-view__filter-trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="label"
      @click="toggle"
    >
      <span class="material-symbols-sharp" aria-hidden="true">filter_list</span>
    </button>
    <div class="dashboard-view__filter-panel" role="menu" :hidden="!open">
      <button
        v-for="[mode, modeLabel] in SORT_MODE_LABELS"
        :key="mode"
        type="button"
        class="dashboard-view__filter-item"
        role="menuitemradio"
        :aria-checked="dashboardLibrary.sortMode[scope] === mode"
        @click="select(mode)"
      >
        <span class="material-symbols-sharp dashboard-view__filter-check" aria-hidden="true">check</span>
        <span>{{ modeLabel }}</span>
      </button>
    </div>
  </div>
</template>
