<script setup lang="ts">
import { computed, ref } from "vue";
import type { LibraryEntry, OverlayEntry } from "../api/types";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useToast } from "../composables/useToast";
import { useLibraryDrag } from "../composables/useLibraryDrag";
import { useClickOutside } from "../composables/useClickOutside";
import { widgetDialog, overlayDialog } from "../composables/useDialogs";
import { formatDate } from "../lib/formatDate";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { setActiveView } from "../composables/useAppView";

const props = withDefaults(
  defineProps<{
    kind: "widget" | "overlay";
    entry: LibraryEntry | OverlayEntry;
    showMeta?: boolean;
  }>(),
  { showMeta: false }
);

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
const widgetEditorStore = useWidgetEditorStore();
const overlayEditorStore = useOverlayEditorStore();
const { showToast } = useToast();
const { startDrag } = useLibraryDrag();

// Sur le dashboard (showMeta), la ligne affiche en plus son projet et sa
// date de modification — même info que la vignette "Modifié le" de
// l'ancienne app.
const metaText = computed(() => {
  const projectName = projectsStore.nameFor(props.entry.projectId);
  const updatedText = props.entry.updatedAt ? `Modifié le ${formatDate(props.entry.updatedAt)}` : "";
  return [projectName, updatedText].filter(Boolean).join(" · ");
});

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
  if (props.kind === "overlay") overlayDialog.value?.openEdit(props.entry as OverlayEntry);
  else widgetDialog.value?.openEdit(props.entry as LibraryEntry);
}

// Clic principal sur un widget/alerte/overlay : l'ouvre dans son éditeur
// (comme switchWidget()/openOverlayEditor() côté vanilla) — modifier son
// nom/projet/icône passe par le menu "⋮ > Modifier" ci-dessous, pas par ce
// clic-là.
function openItem(): void {
  if (props.kind === "overlay") {
    void overlayEditorStore.open(props.entry.id);
    setActiveView("overlay");
    return;
  }
  void widgetEditorStore.open(props.entry.id);
  setActiveView("widget");
}

async function remove(): Promise<void> {
  closeMenu();
  if (!window.confirm(`Supprimer définitivement « ${props.entry.name} » ? Cette action est irréversible.`)) return;
  try {
    if (props.kind === "overlay") await libraryStore.removeOverlay(props.entry.id);
    else await libraryStore.removeWidget(props.entry.id);
    showToast(`${props.entry.name} supprimé`);
  } catch (error) {
    showToast(`Suppression impossible : ${error instanceof Error ? error.message : String(error)}`);
  }
}
</script>

<template>
  <div class="widget-library__row" draggable="true" @dragstart="startDrag($event, kind, entry.id)">
    <button type="button" class="widget-library__item" @click="openItem">
      <span class="widget-library__icon">
        <span class="material-symbols-sharp" aria-hidden="true">{{ entry.icon }}</span>
      </span>
      <span class="widget-library__copy">
        <strong>{{ entry.name }}</strong>
        <small v-if="entry.description">{{ entry.description }}</small>
        <small v-if="showMeta && metaText" class="widget-library__meta">{{ metaText }}</small>
      </span>
    </button>
    <div ref="menuEl" class="widget-library__menu">
      <button
        type="button"
        class="widget-library__options"
        :aria-expanded="menuOpen"
        :aria-label="`Options de ${entry.name}`"
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
