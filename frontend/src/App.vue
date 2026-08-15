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
import { useWidgetEditorStore } from "./stores/widgetEditor";
import { useOverlayEditorStore } from "./stores/overlayEditor";
import { contactDialog, mediaPreviewDialog, overlayDialog, projectDialog, widgetDialog } from "./composables/useDialogs";
import { activeView, setActiveView } from "./composables/useAppView";

const projectsStore = useProjectsStore();
const libraryStore = useLibraryStore();
const accountStore = useAccountStore();
const mediaStore = useMediaStore();
const widgetEditorStore = useWidgetEditorStore();
const overlayEditorStore = useOverlayEditorStore();

// Liens directs ?widget=<id> / ?overlay=<id> (ex. partagés depuis la
// bibliothèque) : portage de la même logique que public/app.js, retiré à la
// bascule Phase 4. `overlay` est prioritaire sur `widget` si les deux sont
// présents, comme côté vanille.
async function openFromQueryParams(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const requestedOverlayId = params.get("overlay");
  const requestedWidgetId = params.get("widget");
  if (requestedOverlayId && libraryStore.overlays.some((entry) => entry.id === requestedOverlayId)) {
    await overlayEditorStore.open(requestedOverlayId);
    setActiveView("overlay");
    return;
  }
  if (requestedWidgetId && libraryStore.widgets.some((entry) => entry.id === requestedWidgetId)) {
    await widgetEditorStore.open(requestedWidgetId);
    setActiveView("widget");
  }
}

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
  void libraryStore.fetchAll().then(openFromQueryParams);
  void mediaStore.fetchAll();
  void accountStore.fetchMe().then(() => {
    void accountStore.fetchIntegrations();
    void accountStore.fetchEnvDefaults();
  });
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
