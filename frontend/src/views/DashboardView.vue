<script setup lang="ts">
import DashboardSearchBar from "../components/DashboardSearchBar.vue";
import DashboardLibraryColumn from "../components/DashboardLibraryColumn.vue";
import DashboardConnectionsSummary from "../components/DashboardConnectionsSummary.vue";
import MediaGrid from "../components/MediaGrid.vue";
import DashboardAddFab from "../components/DashboardAddFab.vue";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { mediaPreviewDialog, streamElementsOverlayPickerDialog } from "../composables/useDialogs";

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
</script>

<template>
  <div class="dashboard-view">
    <div class="dashboard-view__hero">
      <span class="eyebrow">DASHBOARD</span>
      <p>Ton bac à sable local pour créer, tester et peaufiner tes widgets, alertes et overlays StreamElements ou Streamlabs avec aperçu en temps réel — sans jamais toucher à ce qui est déjà en ligne.</p>
    </div>
    <div class="dashboard-view__columns">
      <section class="dashboard-view__group">
        <h3 class="dashboard-view__group-title">Ma bibliothèque</h3>
        <DashboardSearchBar />

        <DashboardLibraryColumn
          scope="project"
          title="Projets"
          :entries="projectsStore.projects"
          empty-message="Aucun projet pour l’instant."
          hint="Glisse un overlay, un widget ou une alerte sur un projet pour l’y déplacer."
        />

        <DashboardLibraryColumn
          scope="overlay"
          title="Overlays"
          :entries="libraryStore.overlays"
          empty-message="Aucun overlay pour l’instant."
        >
          <template #actions>
            <button
              type="button"
              class="icon-button dashboard-view__filter-trigger"
              aria-label="Importer un overlay depuis StreamElements"
              title="Importer depuis StreamElements"
              @click="streamElementsOverlayPickerDialog?.open()"
            >
              <span class="material-symbols-sharp" aria-hidden="true">cloud_download</span>
            </button>
          </template>
        </DashboardLibraryColumn>

        <div class="dashboard-view__group-columns">
          <DashboardLibraryColumn
            scope="widget"
            title="Widgets"
            :entries="libraryStore.widgetEntries"
            empty-message="Aucun widget pour l’instant."
          />
          <DashboardLibraryColumn
            scope="alert"
            title="Alertes"
            :entries="libraryStore.alertEntries"
            empty-message="Aucune alerte pour l’instant."
          />
        </div>
      </section>

      <div class="dashboard-view__column dashboard-view__side">
        <section>
          <h3 class="dashboard-view__group-title">Médias</h3>
          <MediaGrid paginated @preview="mediaPreviewDialog?.open($event)" />
        </section>
        <section>
          <h3 class="dashboard-view__group-title">Comptes</h3>
          <DashboardConnectionsSummary />
        </section>
      </div>
    </div>
    <DashboardAddFab />
  </div>
</template>
