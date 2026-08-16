<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useOverlayEditorStore, type OverlayTool } from "../stores/overlayEditor";
import { useLibraryStore } from "../stores/library";
import { useDropdownToggle } from "../composables/useDropdownToggle";
import { stepOverlayZoom } from "../lib/overlayGeometry";
import type { AlignEdge } from "../lib/overlayItems";

const store = useOverlayEditorStore();
const libraryStore = useLibraryStore();
const addMenu = useDropdownToggle();

const TOOLBAR_POSITION_STORAGE_KEY = "overlay-toolbar-position";
const toolbarEl = ref<HTMLElement | null>(null);
const isDragging = ref(false);

function loadToolbarPosition(): { left: number; top: number } | null {
  try {
    return JSON.parse(localStorage.getItem(TOOLBAR_POSITION_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function applyToolbarPosition(position: { left: number; top: number }): void {
  if (!toolbarEl.value) return;
  toolbarEl.value.style.left = `${position.left}px`;
  toolbarEl.value.style.top = `${position.top}px`;
}

// Position restaurée au montage (localStorage, globale — pas par overlay,
// comme côté vanille).
onMounted(() => {
  const saved = loadToolbarPosition();
  if (saved) applyToolbarPosition(saved);
});

function startToolbarDrag(event: PointerEvent): void {
  event.stopPropagation();
  const toolbar = toolbarEl.value;
  const stage = document.querySelector(".overlay-canvas-stage");
  if (!toolbar || !stage) return;
  toolbar.setPointerCapture(event.pointerId);
  isDragging.value = true;
  const stageRect = stage.getBoundingClientRect();
  const toolbarRect = toolbar.getBoundingClientRect();
  const offsetX = event.clientX - toolbarRect.left;
  const offsetY = event.clientY - toolbarRect.top;

  const onMove = (moveEvent: PointerEvent) => {
    const maxLeft = Math.max(0, stageRect.width - toolbarRect.width);
    const maxTop = Math.max(0, stageRect.height - toolbarRect.height);
    const left = Math.min(maxLeft, Math.max(0, moveEvent.clientX - stageRect.left - offsetX));
    const top = Math.min(maxTop, Math.max(0, moveEvent.clientY - stageRect.top - offsetY));
    applyToolbarPosition({ left, top });
  };
  const onUp = () => {
    toolbar.releasePointerCapture(event.pointerId);
    toolbar.removeEventListener("pointermove", onMove);
    toolbar.removeEventListener("pointerup", onUp);
    isDragging.value = false;
    const rect = toolbar.getBoundingClientRect();
    localStorage.setItem(TOOLBAR_POSITION_STORAGE_KEY, JSON.stringify({ left: rect.left - stageRect.left, top: rect.top - stageRect.top }));
  };
  toolbar.addEventListener("pointermove", onMove);
  toolbar.addEventListener("pointerup", onUp);
}

const projectId = computed(() => store.overlay?.projectId || "");
const projectWidgets = computed(() => libraryStore.entriesForProject(projectId.value).widgets);
const projectAlerts = computed(() => libraryStore.entriesForProject(projectId.value).alerts);

const selectionCount = computed(() => store.selectedIds.size);
const isUngroupMode = computed(() => store.soleSelection?.type === "group");
const groupButtonVisible = computed(() => isUngroupMode.value || selectionCount.value >= 2);

const zoomPercent = computed(() => (store.zoomMode === "fit" ? null : Math.round((store.zoomMode as number) * 100)));

const primitiveTools: { tool: OverlayTool; icon: string; label: string }[] = [
  { tool: "text", icon: "title", label: "Texte" },
  { tool: "image", icon: "image", label: "Image" },
  { tool: "icon", icon: "emoji_symbols", label: "Icône" },
  { tool: "shape", icon: "category", label: "Forme" },
  { tool: "video", icon: "movie", label: "Vidéo" },
  { tool: "embed", icon: "code", label: "Lien intégré" }
];

function pickPrimitive(tool: OverlayTool): void {
  addMenu.close();
  store.setTool(tool);
}

async function pickExistingWidget(widgetId: string, isAlert: boolean): Promise<void> {
  addMenu.close();
  await store.addWidgetItem(widgetId, isAlert);
}

function onGroupClick(): void {
  if (isUngroupMode.value) store.ungroupSelection();
  else store.groupSelection();
}

function align(edge: AlignEdge): void {
  store.align(edge);
}

function distribute(axis: "horizontal" | "vertical"): void {
  store.distribute(axis);
}

function onZoomStep(direction: number): void {
  const current = store.zoomMode === "fit" ? 1 : (store.zoomMode as number);
  store.setZoomMode(stepOverlayZoom(current, direction));
}
</script>

<template>
  <div ref="toolbarEl" class="overlay-toolbar" :class="{ 'is-dragging': isDragging }">
    <button
      type="button"
      class="overlay-toolbar__handle"
      aria-label="Déplacer la barre d'outils"
      title="Déplacer"
      @pointerdown="startToolbarDrag"
    >
      <span class="material-symbols-rounded" aria-hidden="true">drag_indicator</span>
    </button>

    <button
      type="button"
      class="overlay-toolbar__button"
      :class="{ 'is-active': store.tool === 'select' }"
      title="Sélection"
      aria-label="Sélection"
      @click="store.setTool('select')"
    >
      <span class="material-symbols-rounded" aria-hidden="true">arrow_selector_tool</span>
    </button>

    <div class="overlay-toolbar__add" :ref="addMenu.containerEl">
      <button type="button" class="overlay-toolbar__button" aria-label="Ajouter" title="Ajouter" @click.stop="addMenu.toggle">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
        <span>Ajouter</span>
        <span class="material-symbols-rounded overlay-toolbar__add-chevron" aria-hidden="true">expand_more</span>
      </button>
      <div class="overlay-toolbar__add-panel" :hidden="!addMenu.open.value">
        <button v-for="entry in projectWidgets" :key="entry.id" type="button" class="overlay-toolbar__add-item" @click="pickExistingWidget(entry.id, false)">
          <span class="material-symbols-rounded" aria-hidden="true">{{ entry.icon }}</span>
          <span>{{ entry.name }}</span>
        </button>
        <button v-for="entry in projectAlerts" :key="entry.id" type="button" class="overlay-toolbar__add-item" @click="pickExistingWidget(entry.id, true)">
          <span class="material-symbols-rounded" aria-hidden="true">{{ entry.icon }}</span>
          <span>{{ entry.name }}</span>
        </button>
        <div v-if="projectWidgets.length || projectAlerts.length" class="overlay-toolbar__add-divider"></div>
        <button v-for="item in primitiveTools" :key="item.tool" type="button" class="overlay-toolbar__add-item" @click="pickPrimitive(item.tool)">
          <span class="material-symbols-rounded" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <div class="overlay-toolbar__divider"></div>

    <div class="overlay-toolbar__group">
      <button
        v-if="groupButtonVisible"
        type="button"
        class="overlay-toolbar__button"
        :title="isUngroupMode ? 'Dégrouper' : 'Grouper la sélection'"
        :aria-label="isUngroupMode ? 'Dégrouper' : 'Grouper la sélection'"
        @click="onGroupClick"
      >
        <span class="material-symbols-rounded" aria-hidden="true">{{ isUngroupMode ? "call_split" : "select_all" }}</span>
      </button>
      <button v-if="selectionCount >= 1" type="button" class="overlay-toolbar__button" title="Dupliquer" aria-label="Dupliquer" @click="store.duplicateSelected">
        <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
      </button>
      <button v-if="selectionCount >= 1" type="button" class="overlay-toolbar__button" title="Supprimer" aria-label="Supprimer" @click="store.deleteSelected">
        <span class="material-symbols-rounded" aria-hidden="true">delete</span>
      </button>
      <button v-if="selectionCount >= 1" type="button" class="overlay-toolbar__button" title="Centrer" aria-label="Centrer" @click="store.centerSelectionInCanvas">
        <span class="material-symbols-rounded" aria-hidden="true">filter_center_focus</span>
      </button>
    </div>

    <div v-if="selectionCount >= 1" class="overlay-toolbar__divider"></div>

    <div v-if="selectionCount >= 1" class="overlay-toolbar__group">
      <button type="button" class="overlay-toolbar__button" title="Aligner à gauche" aria-label="Aligner à gauche" @click="align('left')">
        <span class="material-symbols-rounded" aria-hidden="true">align_horizontal_left</span>
      </button>
      <button type="button" class="overlay-toolbar__button" title="Centrer horizontalement" aria-label="Centrer horizontalement" @click="align('hcenter')">
        <span class="material-symbols-rounded" aria-hidden="true">align_horizontal_center</span>
      </button>
      <button type="button" class="overlay-toolbar__button" title="Aligner à droite" aria-label="Aligner à droite" @click="align('right')">
        <span class="material-symbols-rounded" aria-hidden="true">align_horizontal_right</span>
      </button>
      <button type="button" class="overlay-toolbar__button" title="Aligner en haut" aria-label="Aligner en haut" @click="align('top')">
        <span class="material-symbols-rounded" aria-hidden="true">align_vertical_top</span>
      </button>
      <button type="button" class="overlay-toolbar__button" title="Centrer verticalement" aria-label="Centrer verticalement" @click="align('vcenter')">
        <span class="material-symbols-rounded" aria-hidden="true">align_vertical_center</span>
      </button>
      <button type="button" class="overlay-toolbar__button" title="Aligner en bas" aria-label="Aligner en bas" @click="align('bottom')">
        <span class="material-symbols-rounded" aria-hidden="true">align_vertical_bottom</span>
      </button>
    </div>

    <div v-if="selectionCount >= 2" class="overlay-toolbar__group">
      <button type="button" class="overlay-toolbar__button" :disabled="selectionCount < 3" title="Distribuer horizontalement" aria-label="Distribuer horizontalement" @click="distribute('horizontal')">
        <span class="material-symbols-rounded" aria-hidden="true">align_space_even</span>
      </button>
      <button type="button" class="overlay-toolbar__button" :disabled="selectionCount < 3" title="Distribuer verticalement" aria-label="Distribuer verticalement" @click="distribute('vertical')">
        <span class="material-symbols-rounded" aria-hidden="true">vertical_distribute</span>
      </button>
    </div>

    <div class="overlay-toolbar__divider"></div>

    <div class="overlay-toolbar__group">
      <button type="button" class="overlay-toolbar__button" :disabled="!store.canUndo" title="Annuler" aria-label="Annuler" @click="store.undo">
        <span class="material-symbols-rounded" aria-hidden="true">undo</span>
      </button>
      <button type="button" class="overlay-toolbar__button" :disabled="!store.canRedo" title="Rétablir" aria-label="Rétablir" @click="store.redo">
        <span class="material-symbols-rounded" aria-hidden="true">redo</span>
      </button>
    </div>

    <div class="overlay-toolbar__divider"></div>

    <div class="overlay-toolbar__group">
      <button
        type="button"
        class="overlay-toolbar__button"
        :class="{ 'is-active': store.guidesVisible }"
        :aria-pressed="store.guidesVisible"
        title="Repères"
        aria-label="Afficher/masquer les repères"
        @click="store.setGuidesVisible(!store.guidesVisible)"
      >
        <span class="material-symbols-rounded" aria-hidden="true">grid_guides</span>
        <span>Repères</span>
      </button>
      <button
        v-if="store.guidesVisible"
        type="button"
        class="overlay-toolbar__button"
        title="Ajouter un repère horizontal"
        aria-label="Ajouter un repère horizontal"
        @click="store.addGuide('horizontal')"
      >
        <span class="material-symbols-rounded" aria-hidden="true">table_rows</span>
      </button>
      <button
        v-if="store.guidesVisible"
        type="button"
        class="overlay-toolbar__button"
        title="Ajouter un repère vertical"
        aria-label="Ajouter un repère vertical"
        @click="store.addGuide('vertical')"
      >
        <span class="material-symbols-rounded" aria-hidden="true">view_column</span>
      </button>
    </div>

    <div class="overlay-toolbar__divider"></div>

    <div class="overlay-toolbar__zoom">
      <button type="button" class="overlay-toolbar__button" title="Zoom arrière" aria-label="Zoom arrière" @click="onZoomStep(-1)">
        <span class="material-symbols-rounded" aria-hidden="true">remove</span>
      </button>
      <button type="button" class="overlay-toolbar__zoom-label" title="Ajuster à la fenêtre" @click="store.setZoomMode('fit')">
        {{ zoomPercent === null ? "Ajuster" : `${zoomPercent}%` }}
      </button>
      <button type="button" class="overlay-toolbar__button" title="Zoom avant" aria-label="Zoom avant" @click="onZoomStep(1)">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
    </div>
  </div>
</template>
