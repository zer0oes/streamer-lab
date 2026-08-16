<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppShell from "./components/AppShell.vue";
import DashboardView from "./views/DashboardView.vue";
import WidgetEditorView from "./views/WidgetEditorView.vue";
import OverlayEditorView from "./views/OverlayEditorView.vue";
import Toast from "./components/Toast.vue";
import ProjectSettingsDialog from "./components/ProjectSettingsDialog.vue";
import WidgetSettingsDialog from "./components/WidgetSettingsDialog.vue";
import OverlaySettingsDialog from "./components/OverlaySettingsDialog.vue";
import ContactDialog from "./components/ContactDialog.vue";
import MediaPreviewDialog from "./components/MediaPreviewDialog.vue";
import { useProjectsStore } from "./stores/projects";
import { useLibraryStore } from "./stores/library";
import { useAccountStore } from "./stores/account";
import { useMediaStore } from "./stores/media";
import { contactDialog, mediaPreviewDialog, overlayDialog, projectDialog, widgetDialog } from "./composables/useDialogs";
import { activeView } from "./composables/useAppView";
import { resolveInitialRoute, startRouteSync } from "./composables/useRouteSync";
import { loadAppState } from "./composables/useAppState";

const projectsStore = useProjectsStore();
const libraryStore = useLibraryStore();
const accountStore = useAccountStore();
const mediaStore = useMediaStore();

const projectDialogRef = ref<InstanceType<typeof ProjectSettingsDialog> | null>(null);
const widgetDialogRef = ref<InstanceType<typeof WidgetSettingsDialog> | null>(null);
const overlayDialogRef = ref<InstanceType<typeof OverlaySettingsDialog> | null>(null);
const contactDialogRef = ref<InstanceType<typeof ContactDialog> | null>(null);
const mediaPreviewDialogRef = ref<InstanceType<typeof MediaPreviewDialog> | null>(null);

onMounted(() => {
  projectDialog.value = projectDialogRef.value;
  widgetDialog.value = widgetDialogRef.value;
  overlayDialog.value = overlayDialogRef.value;
  contactDialog.value = contactDialogRef.value;
  mediaPreviewDialog.value = mediaPreviewDialogRef.value;
  void projectsStore.fetchProjects();
  void libraryStore.fetchAll().then(resolveInitialRoute);
  // Chargée une fois pour toute l'app (session/chaîne de démo) : les
  // aperçus widget/overlay en ont besoin dès leur premier onWidgetLoad, pas
  // la peine d'attendre qu'un éditeur soit ouvert pour la lancer.
  void loadAppState();
  void mediaStore.fetchAll();
  void accountStore.fetchMe().then(() => {
    void accountStore.fetchIntegrations();
    void accountStore.fetchEnvDefaults();
  });
  startRouteSync();
});
</script>

<template>
  <AppShell>
    <DashboardView v-if="activeView === 'dashboard'" />
    <WidgetEditorView v-else-if="activeView === 'widget'" />
    <OverlayEditorView v-else-if="activeView === 'overlay'" />
  </AppShell>
  <Toast />
  <ProjectSettingsDialog ref="projectDialogRef" />
  <WidgetSettingsDialog ref="widgetDialogRef" />
  <OverlaySettingsDialog ref="overlayDialogRef" />
  <ContactDialog ref="contactDialogRef" />
  <MediaPreviewDialog ref="mediaPreviewDialogRef" />
</template>
