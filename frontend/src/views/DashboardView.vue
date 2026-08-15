<script setup lang="ts">
import ProjectCards from "../components/ProjectCards.vue";
import DashboardSearchBar from "../components/DashboardSearchBar.vue";
import DashboardLibraryColumn from "../components/DashboardLibraryColumn.vue";
import DashboardConnectionsSummary from "../components/DashboardConnectionsSummary.vue";
import MediaGrid from "../components/MediaGrid.vue";
import { useLibraryStore } from "../stores/library";
import { mediaPreviewDialog } from "../composables/useDialogs";

const libraryStore = useLibraryStore();
</script>

<template>
  <div class="dashboard-view">
    <div class="dashboard-view__hero">
      <span class="eyebrow">DASHBOARD</span>
      <h2>Bienvenue sur Streamer <span class="text-accent">Lab</span></h2>
      <p>
        Ton bac à sable local pour créer, tester et peaufiner tes widgets, alertes et overlays StreamElements ou Streamlabs en aperçu
        temps réel — sans jamais toucher à ce qui est déjà en ligne.
      </p>
    </div>
    <ProjectCards />

    <div class="dashboard-view__columns">
      <section class="dashboard-view__group">
        <h3 class="dashboard-view__group-title">Ma bibliothèque</h3>
        <DashboardSearchBar />

        <DashboardLibraryColumn
          scope="overlay"
          title="Overlays"
          :entries="libraryStore.overlays"
          empty-message="Aucun overlay pour l’instant."
        />

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
          <MediaGrid @preview="mediaPreviewDialog?.open($event)" />
        </section>
        <section>
          <h3 class="dashboard-view__group-title">Comptes</h3>
          <DashboardConnectionsSummary />
        </section>
      </div>
    </div>
  </div>
</template>
