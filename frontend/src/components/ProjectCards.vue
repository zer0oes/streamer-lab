<script setup lang="ts">
import { ref } from "vue";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { projectDialog } from "../composables/useDialogs";
import { useLibraryDrag } from "../composables/useLibraryDrag";
import type { Project } from "../api/types";

const projectsStore = useProjectsStore();
const libraryStore = useLibraryStore();
const { handleDrop } = useLibraryDrag();

const dropTargetId = ref<string | null>(null);

function onDragOver(event: DragEvent, projectId: string): void {
  event.preventDefault();
  dropTargetId.value = projectId;
}

function onDrop(event: DragEvent, projectId: string): void {
  dropTargetId.value = null;
  void handleDrop(event, projectId);
}

function openEdit(project: Project): void {
  projectDialog.value?.openEdit(project);
}
</script>

<template>
  <section class="dashboard-view__projects-section">
    <div class="dashboard-view__column-header">
      <h4 class="dashboard-view__column-title">Projets</h4>
      <button
        type="button"
        class="icon-button"
        aria-label="Nouveau projet"
        title="Nouveau projet"
        @click="projectDialog?.openCreate()"
      >
        <span class="material-symbols-rounded" aria-hidden="true">create_new_folder</span>
      </button>
    </div>
    <p class="dashboard-view__projects-hint">Glisse un overlay, un widget ou une alerte sur un projet pour l’y déplacer.</p>
    <div class="project-cards">
      <div
        v-for="project in projectsStore.projects"
        :key="project.id"
        class="project-card"
        :class="{ 'is-drop-target': dropTargetId === project.id }"
        @dragover="onDragOver($event, project.id)"
        @dragleave="dropTargetId = null"
        @drop="onDrop($event, project.id)"
      >
        <span class="project-card__icon material-symbols-rounded" aria-hidden="true">{{ project.icon }}</span>
        <span class="project-card__copy">
          <strong>{{ project.name }}</strong>
          <small>
            {{ libraryStore.entriesForProject(project.id).overlays.length }} overlay(s) ·
            {{ libraryStore.entriesForProject(project.id).widgets.length }} widget(s) ·
            {{ libraryStore.entriesForProject(project.id).alerts.length }} alerte(s)
          </small>
        </span>
        <button
          type="button"
          class="project-card__edit"
          :title="`Modifier « ${project.name} »`"
          :aria-label="`Modifier le projet ${project.name}`"
          @click="openEdit(project)"
        >
          <span class="material-symbols-rounded" aria-hidden="true">edit</span>
        </button>
      </div>
    </div>
  </section>
</template>
