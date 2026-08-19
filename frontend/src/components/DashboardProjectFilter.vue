<script setup lang="ts">
import { computed } from "vue";
import { useProjectsStore } from "../stores/projects";
import { useDashboardLibraryStore } from "../stores/dashboardLibrary";
import { useDropdownToggle } from "../composables/useDropdownToggle";

const projectsStore = useProjectsStore();
const dashboardLibrary = useDashboardLibraryStore();
const { open, containerEl, toggle, close } = useDropdownToggle();

const currentLabel = computed(
  () => projectsStore.projects.find((project) => project.id === dashboardLibrary.projectFilterId)?.name ?? "Tous les projets"
);

function select(projectId: string): void {
  dashboardLibrary.setProjectFilter(projectId);
  close();
}
</script>

<template>
  <div ref="containerEl" class="dashboard-view__project-filter">
    <button
      type="button"
      class="dashboard-view__project-filter-trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Filtrer par projet"
      @click="toggle"
    >
      <span class="material-symbols-sharp" aria-hidden="true">folder</span>
      <span class="dashboard-view__project-filter-label">{{ currentLabel }}</span>
      <span class="material-symbols-sharp dashboard-view__project-filter-chevron" aria-hidden="true">expand_more</span>
    </button>
    <div class="dashboard-view__filter-panel" role="menu" :hidden="!open">
      <button
        type="button"
        class="dashboard-view__filter-item"
        role="menuitemradio"
        :aria-checked="dashboardLibrary.projectFilterId === ''"
        @click="select('')"
      >
        <span class="material-symbols-sharp dashboard-view__filter-check" aria-hidden="true">check</span>
        <span>Tous les projets</span>
      </button>
      <button
        v-for="project in projectsStore.projects"
        :key="project.id"
        type="button"
        class="dashboard-view__filter-item"
        role="menuitemradio"
        :aria-checked="dashboardLibrary.projectFilterId === project.id"
        @click="select(project.id)"
      >
        <span class="material-symbols-sharp dashboard-view__filter-check" aria-hidden="true">check</span>
        <span>{{ project.name }}</span>
      </button>
    </div>
  </div>
</template>
