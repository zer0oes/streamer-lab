<script setup lang="ts">
import { computed, ref } from "vue";
import type { Project } from "../api/types";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useDashboardLibraryStore } from "../stores/dashboardLibrary";
import { useLibraryDrag } from "../composables/useLibraryDrag";
import { useClickOutside } from "../composables/useClickOutside";
import { useToast } from "../composables/useToast";
import { projectDialog } from "../composables/useDialogs";

const props = defineProps<{ entry: Project }>();

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
const dashboardLibrary = useDashboardLibraryStore();
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

// Clic sur la carte : n'affiche plus que le contenu de ce projet dans tout le
// dashboard (overlays, widgets, alertes, médias) — même filtre que le menu
// "Filtrer par projet" de la barre de recherche. Re-cliquer le retire. La
// modification du projet reste accessible via le menu ⋮.
const isSelected = computed(() => dashboardLibrary.projectFilterId === props.entry.id);

function toggleSelection(): void {
  dashboardLibrary.setProjectFilter(isSelected.value ? "" : props.entry.id);
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
    <button
      type="button"
      class="widget-library__item"
      :class="{ 'is-active': isSelected }"
      :aria-pressed="isSelected"
      :title="isSelected ? 'Afficher tous les projets' : `Afficher uniquement le contenu de ${entry.name}`"
      @click="toggleSelection"
    >
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
