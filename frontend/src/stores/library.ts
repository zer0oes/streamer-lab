import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  createOverlay,
  deleteOverlay,
  listOverlays,
  moveOverlayToProject,
  updateOverlayMetadata,
  type OverlayMetadataInput
} from "../api/overlays";
import {
  createWidget,
  deleteWidget,
  listWidgets,
  moveWidgetToProject,
  updateWidgetMetadata,
  type WidgetMetadataInput
} from "../api/widgets";
import type { LibraryEntry, OverlayEntry } from "../api/types";

export const useLibraryStore = defineStore("library", () => {
  const widgets = ref<LibraryEntry[]>([]);
  const overlays = ref<OverlayEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const widgetEntries = computed(() => widgets.value.filter((entry) => entry.type !== "alert"));
  const alertEntries = computed(() => widgets.value.filter((entry) => entry.type === "alert"));

  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [widgetList, overlayList] = await Promise.all([listWidgets(), listOverlays()]);
      widgets.value = widgetList;
      overlays.value = overlayList;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  async function refreshWidgets(): Promise<void> {
    widgets.value = await listWidgets();
  }

  async function refreshOverlays(): Promise<void> {
    overlays.value = await listOverlays();
  }

  async function addWidget(input: WidgetMetadataInput, projectId: string): Promise<LibraryEntry> {
    const widget = await createWidget(input, projectId);
    widgets.value = [...widgets.value, widget];
    return widget;
  }

  async function updateWidget(widgetId: string, input: WidgetMetadataInput): Promise<LibraryEntry> {
    const widget = await updateWidgetMetadata(widgetId, input);
    widgets.value = widgets.value.map((entry) => (entry.id === widget.id ? widget : entry));
    return widget;
  }

  async function addOverlay(input: OverlayMetadataInput, projectId: string): Promise<OverlayEntry> {
    const overlay = await createOverlay(input, projectId);
    overlays.value = [...overlays.value, overlay];
    return overlay;
  }

  async function updateOverlay(overlayId: string, input: OverlayMetadataInput): Promise<OverlayEntry> {
    const overlay = await updateOverlayMetadata(overlayId, input);
    overlays.value = overlays.value.map((entry) => (entry.id === overlay.id ? overlay : entry));
    return overlay;
  }

  async function moveWidget(widgetId: string, projectId: string): Promise<void> {
    const current = widgets.value.find((entry) => entry.id === widgetId);
    if (!current || current.projectId === projectId) return;
    const updated = await moveWidgetToProject(widgetId, projectId);
    widgets.value = widgets.value.map((entry) => (entry.id === widgetId ? updated : entry));
  }

  async function moveOverlay(overlayId: string, projectId: string): Promise<void> {
    const current = overlays.value.find((entry) => entry.id === overlayId);
    if (!current || current.projectId === projectId) return;
    const updated = await moveOverlayToProject(overlayId, projectId);
    overlays.value = overlays.value.map((entry) => (entry.id === overlayId ? updated : entry));
    // Un overlay déplacé peut avoir emmené avec lui des widgets/alertes qu'il
    // référence encore dans l'ancien projet (cf. server.mjs) : on
    // resynchronise le catalogue widgets plutôt que de deviner ce qui a bougé.
    await refreshWidgets();
  }

  async function removeWidget(widgetId: string): Promise<void> {
    await deleteWidget(widgetId);
    widgets.value = widgets.value.filter((entry) => entry.id !== widgetId);
  }

  async function removeOverlay(overlayId: string): Promise<void> {
    await deleteOverlay(overlayId);
    overlays.value = overlays.value.filter((entry) => entry.id !== overlayId);
  }

  function removeAllForProject(projectId: string): void {
    widgets.value = widgets.value.filter((entry) => entry.projectId !== projectId);
    overlays.value = overlays.value.filter((entry) => entry.projectId !== projectId);
  }

  function entriesForProject(projectId: string) {
    return {
      widgets: widgetEntries.value.filter((entry) => entry.projectId === projectId),
      alerts: alertEntries.value.filter((entry) => entry.projectId === projectId),
      overlays: overlays.value.filter((entry) => entry.projectId === projectId)
    };
  }

  return {
    widgets,
    overlays,
    loading,
    error,
    widgetEntries,
    alertEntries,
    fetchAll,
    refreshWidgets,
    refreshOverlays,
    addWidget,
    updateWidget,
    addOverlay,
    updateOverlay,
    moveWidget,
    moveOverlay,
    removeWidget,
    removeOverlay,
    removeAllForProject,
    entriesForProject
  };
});
