<script setup lang="ts">
// Bouton flottant "+" du Dashboard : ouvre un menu pour créer un projet, un
// overlay, un widget ou une alerte sans passer par une section de "Ma
// bibliothèque" en particulier. Le CSS (.dashboard-add-fab) existait déjà
// (héritage de la version vanille, 2 items widget/alerte seulement) ; ce
// composant le porte côté Vue en l'étendant aux 4 types demandés.
import { useProjectsStore } from "../stores/projects";
import { useDropdownToggle } from "../composables/useDropdownToggle";
import { projectDialog, overlayDialog, widgetDialog } from "../composables/useDialogs";

const projectsStore = useProjectsStore();
const { open, containerEl, toggle, close } = useDropdownToggle();

function addProject(): void {
  close();
  projectDialog.value?.openCreate();
}

function addOverlay(): void {
  close();
  overlayDialog.value?.openCreate(projectsStore.projects[0]?.id);
}

function addWidget(): void {
  close();
  widgetDialog.value?.openCreate("widget", projectsStore.projects[0]?.id);
}

function addAlert(): void {
  close();
  widgetDialog.value?.openCreate("alert", projectsStore.projects[0]?.id);
}
</script>

<template>
  <div ref="containerEl" class="dashboard-add-fab">
    <button
      type="button"
      class="dashboard-add-fab__trigger"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Ajouter"
      title="Ajouter"
      @click="toggle"
    >
      <span class="material-symbols-sharp" aria-hidden="true">add</span>
    </button>
    <div class="dashboard-add-fab__panel" role="menu" :hidden="!open">
      <button type="button" class="dashboard-add-fab__item" role="menuitem" @click="addProject">
        <span class="material-symbols-sharp" aria-hidden="true">create_new_folder</span>
        <span>Ajouter un projet</span>
      </button>
      <button type="button" class="dashboard-add-fab__item" role="menuitem" @click="addOverlay">
        <span class="material-symbols-sharp" aria-hidden="true">desktop_landscape</span>
        <span>Ajouter un overlay</span>
      </button>
      <button type="button" class="dashboard-add-fab__item" role="menuitem" @click="addWidget">
        <span class="material-symbols-sharp" aria-hidden="true">widgets</span>
        <span>Ajouter un widget</span>
      </button>
      <button type="button" class="dashboard-add-fab__item" role="menuitem" @click="addAlert">
        <span class="material-symbols-sharp" aria-hidden="true">campaign</span>
        <span>Ajouter une alerte</span>
      </button>
    </div>
  </div>
</template>
