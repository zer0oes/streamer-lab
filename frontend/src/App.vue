<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppShell from "./components/AppShell.vue";
import DashboardView from "./views/DashboardView.vue";
import WidgetEditorView from "./views/WidgetEditorView.vue";
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
  void libraryStore.fetchAll();
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
  </AppShell>
  <Toast />
  <ProjectSettingsDialog ref="projectDialogRef" />
  <WidgetSettingsDialog ref="widgetDialogRef" />
  <OverlaySettingsDialog ref="overlayDialogRef" />
  <ContactDialog ref="contactDialogRef" />
  <MediaPreviewDialog ref="mediaPreviewDialogRef" />
</template>
