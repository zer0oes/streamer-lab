<script setup lang="ts">
import { ref } from "vue";
import type { Project } from "../api/types";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useLibraryDrag } from "../composables/useLibraryDrag";
import { useClickOutside } from "../composables/useClickOutside";
import { useToast } from "../composables/useToast";
import { projectDialog } from "../composables/useDialogs";

const props = defineProps<{ entry: Project }>();

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
const { showToast } = useToast();
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

const menuOpen = ref(false);
const menuEl = ref<HTMLElement | null>(null);
useClickOutside(menuEl, () => {
  menuOpen.value = false;
});

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value;
}

function closeMenu(): void {
  menuOpen.value = false;
}

function edit(): void {
  closeMenu();
  openEdit();
}

// Même avertissement (compte des overlays/widgets/alertes du projet) que la
// suppression depuis ProjectSettingsDialog — juste accessible directement
// depuis la carte, comme pour un overlay/widget/alerte (cf. LibraryRow.remove).
async function remove(): Promise<void> {
  closeMenu();
  const counts = libraryStore.entriesForProject(props.entry.id);
  const itemCount = counts.widgets.length + counts.alerts.length + counts.overlays.length;
  const warning = itemCount
    ? `Supprimer le projet « ${props.entry.name} » supprimera aussi ${itemCount} overlay(s)/widget(s)/alerte(s) qu'il contient. Cette action est irréversible.`
    : `Supprimer définitivement le projet « ${props.entry.name} » ? Cette action est irréversible.`;
  if (!window.confirm(warning)) return;

  try {
    await projectsStore.remove(props.entry.id);
    libraryStore.removeAllForProject(props.entry.id);
    showToast(`Projet « ${props.entry.name} » supprimé`);
  } catch (error) {
    showToast(`Suppression impossible : ${error instanceof Error ? error.message : String(error)}`);
  }
}
</script>

<template>
  <div class="widget-library__row" :class="{ 'is-drop-target': isDropTarget }" @dragover="onDragOver" @dragleave="isDropTarget = false" @drop="onDrop">
    <button type="button" class="widget-library__item" @click="openEdit">
      <span class="widget-library__icon">
        <span class="material-symbols-sharp" aria-hidden="true">{{ entry.icon }}</span>
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
    <div ref="menuEl" class="widget-library__menu">
      <button
        type="button"
        class="widget-library__options"
        :aria-expanded="menuOpen"
        :aria-label="`Options du projet ${entry.name}`"
        @click.stop="toggleMenu"
      >
        <span class="material-symbols-sharp" aria-hidden="true">more_vert</span>
      </button>
      <div class="widget-library__options-panel" role="menu" :hidden="!menuOpen">
        <button type="button" class="widget-library__options-item" role="menuitem" @click="edit">
          <span class="material-symbols-sharp" aria-hidden="true">edit</span>
          <span>Modifier</span>
        </button>
        <button type="button" class="widget-library__options-item is-danger" role="menuitem" @click="remove">
          <span class="material-symbols-sharp" aria-hidden="true">delete</span>
          <span>Supprimer</span>
        </button>
      </div>
    </div>
  </div>
</template>
