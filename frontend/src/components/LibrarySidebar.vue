<script setup lang="ts">
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { mediaPreviewDialog, projectDialog } from "../composables/useDialogs";
import { sidebarCollapsed, setSidebarCollapsed, toggleSidebarCollapsed } from "../composables/useSidebarCollapse";
import { activeView, setActiveView } from "../composables/useAppView";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import LibraryGroupSection from "./LibraryGroupSection.vue";
import ProjectLibraryRow from "./ProjectLibraryRow.vue";
import SidebarFooter from "./SidebarFooter.vue";
import MediaGrid from "./MediaGrid.vue";

const projectsStore = useProjectsStore();
const libraryStore = useLibraryStore();
const widgetEditorStore = useWidgetEditorStore();

function expandTo(): void {
  setSidebarCollapsed(false);
}

async function goToDashboard(): Promise<void> {
  if (activeView.value === "widget") await widgetEditorStore.flushDirtyFiles();
  setActiveView("dashboard");
}
</script>

<template>
  <aside class="panel controls">
    <div class="controls__toolbar">
      <button
        type="button"
        class="sidebar-nav-item"
        :class="{ 'is-active': activeView === 'dashboard' }"
        aria-label="Tableau de bord"
        title="Tableau de bord"
        @click="goToDashboard"
      >
        <span class="material-symbols-sharp" aria-hidden="true">dashboard</span>
        <span>Dashboard</span>
      </button>
      <button type="button" class="sidebar-nav-item sidebar-nav-item--rail-only" aria-label="Médias" title="Médias" @click="expandTo">
        <span class="material-symbols-sharp" aria-hidden="true">perm_media</span>
        <span>Médias</span>
      </button>
      <button type="button" class="sidebar-nav-item sidebar-nav-item--rail-only" aria-label="Bibliothèque" title="Bibliothèque" @click="expandTo">
        <span class="material-symbols-sharp" aria-hidden="true">topic</span>
        <span>Bibliothèque</span>
      </button>
      <button type="button" class="sidebar-nav-item sidebar-nav-item--rail-only" aria-label="Projets" title="Projets" @click="expandTo">
        <span class="material-symbols-sharp" aria-hidden="true">folder_open</span>
        <span>Projets</span>
      </button>
      <button
        type="button"
        class="sidebar-toggle"
        :aria-expanded="!sidebarCollapsed"
        :aria-label="sidebarCollapsed ? 'Déplier le panneau' : 'Replier le panneau'"
        @click="toggleSidebarCollapsed"
      >
        <span class="material-symbols-sharp" aria-hidden="true">{{ sidebarCollapsed ? "left_panel_open" : "left_panel_close" }}</span>
      </button>
    </div>
    <div class="controls__body">
      <details class="sidebar-panel" data-sidebar-panel="projects">
        <summary class="sidebar-panel__summary">
          <span class="material-symbols-sharp" aria-hidden="true">folder_open</span>
          <span class="sidebar-panel__label">Projets</span>
          <span class="material-symbols-sharp sidebar-panel__chevron" aria-hidden="true">expand_more</span>
        </summary>
        <div class="sidebar-panel__body">
          <div class="widget-library">
            <ProjectLibraryRow v-for="project in projectsStore.projects" :key="project.id" :entry="project" />
            <p v-if="!projectsStore.projects.length" class="widget-library__empty">Aucun projet pour l’instant.</p>
          </div>
          <button type="button" class="button button--wide widget-library__add" @click="projectDialog?.openCreate()">
            <span class="material-symbols-sharp" aria-hidden="true">add</span>
            <span>Ajouter un projet</span>
          </button>
        </div>
      </details>
      <details class="sidebar-panel" data-sidebar-panel="library" open>
        <summary class="sidebar-panel__summary">
          <span class="material-symbols-sharp" aria-hidden="true">topic</span>
          <span class="sidebar-panel__label">Bibliothèque</span>
          <span class="material-symbols-sharp sidebar-panel__chevron" aria-hidden="true">expand_more</span>
        </summary>
        <div class="sidebar-panel__body">
          <LibraryGroupSection
            kind="overlay"
            icon="desktop_landscape"
            label="Overlays"
            :entries="libraryStore.overlays"
            :projects="projectsStore.projects"
            empty-message="Aucun overlay pour l’instant."
            add-label="Ajouter un overlay"
            open-by-default
          />
          <LibraryGroupSection
            kind="widget"
            icon="widgets"
            label="Widgets"
            :entries="libraryStore.widgetEntries"
            :projects="projectsStore.projects"
            empty-message="Aucun widget pour l’instant."
            add-label="Ajouter un widget"
          />
          <LibraryGroupSection
            kind="alert"
            icon="campaign"
            label="Alertes"
            :entries="libraryStore.alertEntries"
            :projects="projectsStore.projects"
            empty-message="Aucune alerte pour l’instant."
            add-label="Ajouter une alerte"
          />
        </div>
      </details>
      <details class="sidebar-panel" data-sidebar-panel="media">
        <summary class="sidebar-panel__summary">
          <span class="material-symbols-sharp" aria-hidden="true">perm_media</span>
          <span class="sidebar-panel__label">Médias</span>
          <span class="material-symbols-sharp sidebar-panel__chevron" aria-hidden="true">expand_more</span>
        </summary>
        <div class="sidebar-panel__body">
          <MediaGrid @preview="mediaPreviewDialog?.open($event)" />
        </div>
      </details>
    </div>
    <SidebarFooter />
  </aside>
</template>
