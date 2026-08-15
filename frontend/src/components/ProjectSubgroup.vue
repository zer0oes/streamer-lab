<script setup lang="ts">
import { ref } from "vue";
import type { Project } from "../api/types";
import { projectDialog } from "../composables/useDialogs";
import { useLibraryDrag } from "../composables/useLibraryDrag";

const props = defineProps<{
  project: Project;
  count: number;
}>();

const { handleDrop } = useLibraryDrag();
const isDropTarget = ref(false);

function onDragOver(event: DragEvent): void {
  event.preventDefault();
  isDropTarget.value = true;
}

function onDrop(event: DragEvent): void {
  isDropTarget.value = false;
  void handleDrop(event, props.project.id);
}

function openEdit(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  projectDialog.value?.openEdit(props.project);
}
</script>

<template>
  <details class="library-subgroup" open>
    <summary
      class="library-subgroup__summary"
      :class="{ 'is-drop-target': isDropTarget }"
      @dragover="onDragOver"
      @dragleave="isDropTarget = false"
      @drop="onDrop"
    >
      <span class="material-symbols-rounded" aria-hidden="true">{{ project.icon }}</span>
      <span class="library-subgroup__label">{{ project.name }}</span>
      <span class="library-subgroup__count">{{ count }}</span>
      <button type="button" class="library-subgroup__edit" :title="`Modifier le projet « ${project.name} »`" @click="openEdit">
        <span class="material-symbols-rounded" aria-hidden="true">edit</span>
      </button>
      <span class="material-symbols-rounded library-subgroup__chevron" aria-hidden="true">expand_more</span>
    </summary>
    <div class="library-subgroup__body">
      <slot />
    </div>
  </details>
</template>
