<script setup lang="ts">
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { mediaPreviewDialog, projectDialog } from "../composables/useDialogs";
import { sidebarCollapsed, setSidebarCollapsed, toggleSidebarCollapsed } from "../composables/useSidebarCollapse";
import { activeView, setActiveView } from "../composables/useAppView";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import LibraryGroupSection from "./LibraryGroupSection.vue";
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
        <span class="material-symbols-rounded" aria-hidden="true">dashboard</span>
        <span>Dashboard</span>
      </button>
      <button type="button" class="sidebar-nav-item sidebar-nav-item--rail-only" aria-label="Ma bibliothèque" title="Ma bibliothèque" @click="expandTo">
        <span class="material-symbols-rounded" aria-hidden="true">topic</span>
        <span>Ma bibliothèque</span>
      </button>
      <button type="button" class="sidebar-nav-item sidebar-nav-item--rail-only" aria-label="Médias" title="Médias" @click="expandTo">
        <span class="material-symbols-rounded" aria-hidden="true">perm_media</span>
        <span>Médias</span>
      </button>
      <button
        type="button"
        class="sidebar-toggle"
        :aria-expanded="!sidebarCollapsed"
        :aria-label="sidebarCollapsed ? 'Déplier le panneau' : 'Replier le panneau'"
        @click="toggleSidebarCollapsed"
      >
        <span class="material-symbols-rounded" aria-hidden="true">{{ sidebarCollapsed ? "chevron_right" : "chevron_left" }}</span>
      </button>
    </div>
    <div class="controls__body">
      <details class="sidebar-section" data-sidebar-section="library" open>
        <summary class="sidebar-section__summary">
          <div class="sidebar-section__heading">
            <div class="sidebar-section__heading-actions">
              <span class="sidebar-section__step material-symbols-rounded" aria-hidden="true">topic</span>
              <h2>Ma bibliothèque</h2>
            </div>
            <span class="sidebar-section__meta">
              <span class="material-symbols-rounded sidebar-section__chevron" aria-hidden="true">expand_more</span>
            </span>
          </div>
        </summary>
        <div class="sidebar-section__body">
          <div class="library-projects-bar">
            <button type="button" class="button button--quiet library-projects-bar__add" @click="projectDialog?.openCreate()">
              <span class="material-symbols-rounded" aria-hidden="true">create_new_folder</span>
              <span>Nouveau projet</span>
            </button>
          </div>
          <LibraryGroupSection
            kind="overlay"
            icon="desktop_landscape"
            label="Overlays"
            :entries="libraryStore.overlays"
            :projects="projectsStore.projects"
            empty-message="Aucun overlay pour l’instant."
            add-label="Ajouter un overlay"
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
      <details class="sidebar-section" data-sidebar-section="media">
        <summary class="sidebar-section__summary">
          <div class="sidebar-section__heading">
            <div class="sidebar-section__heading-actions">
              <span class="sidebar-section__step material-symbols-rounded" aria-hidden="true">perm_media</span>
              <h2>Médias</h2>
            </div>
            <span class="sidebar-section__meta">
              <span class="material-symbols-rounded sidebar-section__chevron" aria-hidden="true">expand_more</span>
            </span>
          </div>
        </summary>
        <div class="sidebar-section__body">
          <MediaGrid @preview="mediaPreviewDialog?.open($event)" />
        </div>
      </details>
    </div>
    <SidebarFooter />
  </aside>
</template>
