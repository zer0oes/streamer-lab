<script setup lang="ts">
import { ref } from "vue";
import type { Project } from "../api/types";
import { useLibraryStore } from "../stores/library";
import { useLibraryDrag } from "../composables/useLibraryDrag";
import { projectDialog } from "../composables/useDialogs";

const props = defineProps<{ entry: Project }>();

const libraryStore = useLibraryStore();
const { handleDrop } = useLibraryDrag();
const isDropTarget = ref(false);

function onDragOver(event: DragEvent): void {
  event.preventDefault();
  isDropTarget.value = true;
}

function onDrop(event: DragEvent): void {
  isDropTarget.value = false;
  void handleDrop(event, props.entry.id);
}

function openEdit(): void {
  projectDialog.value?.openEdit(props.entry);
}
</script>

<template>
  <div class="widget-library__row" :class="{ 'is-drop-target': isDropTarget }" @dragover="onDragOver" @dragleave="isDropTarget = false" @drop="onDrop">
    <button type="button" class="widget-library__item" @click="openEdit">
      <span class="widget-library__icon">
        <span class="material-symbols-rounded" aria-hidden="true">{{ entry.icon }}</span>
      </span>
      <span class="widget-library__copy">
        <strong>{{ entry.name }}</strong>
        <small>
          {{ libraryStore.entriesForProject(entry.id).overlays.length }} overlay(s) ·
          {{ libraryStore.entriesForProject(entry.id).widgets.length }} widget(s) ·
          {{ libraryStore.entriesForProject(entry.id).alerts.length }} alerte(s)
        </small>
      </span>
    </button>
    <button type="button" class="icon-button widget-library__options" title="Modifier" :aria-label="`Modifier le projet ${entry.name}`" @click="openEdit">
      <span class="material-symbols-rounded" aria-hidden="true">edit</span>
    </button>
  </div>
</template>
