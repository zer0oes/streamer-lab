<script setup lang="ts">
import { computed } from "vue";
import type { LibraryEntry, OverlayEntry, Project } from "../api/types";
import ProjectSubgroup from "./ProjectSubgroup.vue";
import LibraryRow from "./LibraryRow.vue";
import { widgetDialog, overlayDialog } from "../composables/useDialogs";

const props = defineProps<{
  kind: "widget" | "overlay" | "alert";
  icon: string;
  label: string;
  entries: (LibraryEntry | OverlayEntry)[];
  projects: Project[];
  emptyMessage: string;
  addLabel: string;
}>();

// Avec un seul projet, l'en-tête de sous-groupe ne ferait que dupliquer le
// groupe Overlays/Widgets/Alertes juste au-dessus — la liste reste à plat
// (cf. décision prise pour la version vanilla, portée telle quelle ici).
const showSubgroups = computed(() => props.projects.length > 1);
const rowKind = computed<"widget" | "overlay">(() => (props.kind === "overlay" ? "overlay" : "widget"));

function entriesForProject(projectId: string): (LibraryEntry | OverlayEntry)[] {
  return props.entries.filter((entry) => entry.projectId === projectId);
}

function addNew(): void {
  const defaultProjectId = props.projects[0]?.id;
  if (props.kind === "overlay") overlayDialog.value?.openCreate(defaultProjectId);
  else widgetDialog.value?.openCreate(props.kind === "alert" ? "alert" : "widget", defaultProjectId);
}
</script>

<template>
  <details class="library-group" open>
    <summary class="library-group__summary">
      <span class="material-symbols-rounded" aria-hidden="true">{{ icon }}</span>
      <span class="library-group__label">{{ label }}</span>
      <span class="library-group__count">{{ entries.length }}</span>
      <span class="material-symbols-rounded library-group__chevron" aria-hidden="true">expand_more</span>
    </summary>
    <div class="library-group__body">
      <div class="widget-library">
        <template v-if="showSubgroups">
          <ProjectSubgroup v-for="project in projects" :key="project.id" :project="project" :count="entriesForProject(project.id).length">
            <LibraryRow v-for="entry in entriesForProject(project.id)" :key="entry.id" :kind="rowKind" :entry="entry" />
            <p v-if="!entriesForProject(project.id).length" class="widget-library__empty">Rien ici pour l’instant.</p>
          </ProjectSubgroup>
        </template>
        <template v-else>
          <LibraryRow v-for="entry in entries" :key="entry.id" :kind="rowKind" :entry="entry" />
          <p v-if="!entries.length" class="widget-library__empty">{{ emptyMessage }}</p>
        </template>
      </div>
      <button type="button" class="button button--wide widget-library__add" @click="addNew">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
        <span>{{ addLabel }}</span>
      </button>
    </div>
  </details>
</template>
