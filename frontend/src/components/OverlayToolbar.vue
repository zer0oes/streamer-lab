<script setup lang="ts">
// Restauré pour correspondre à la barre d'outils de l'app d'origine (avant
// la réécriture Vue) : ordre des groupes, classes (.overlay-toolbar__button
// pour les outils/bascules, icon-button pour les actions), et fonctionnalités
// disparues en route (outil Texte autonome, pipette de style, sélecteur
// "Widget / Alerte", création "Nouveau widget/alerte" avec dépôt immédiat sur
// le canevas). Seule exception assumée : pas de rubans gradués glisser-
// déposer pour les repères (jamais portés, cf. LayersPanel/OverlayToolbar
// history) — les deux boutons "ajouter un repère" restent en substitut
// fonctionnel tant que ça n'a pas été demandé explicitement.
import { computed, onMounted, ref } from "vue";
import { useOverlayEditorStore, type OverlayTool } from "../stores/overlayEditor";
import { useDropdownToggle } from "../composables/useDropdownToggle";
import { stepOverlayZoom } from "../lib/overlayGeometry";
import { widgetDialog, pendingOverlayWidgetPlacement } from "../composables/useDialogs";
import OverlayItemPickerDialog from "./OverlayItemPickerDialog.vue";
import type { AlignEdge } from "../lib/overlayItems";
import type { LibraryEntry } from "../api/types";

const store = useOverlayEditorStore();
const addMenu = useDropdownToggle();
const itemPickerRef = ref<InstanceType<typeof OverlayItemPickerDialog> | null>(null);

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

const selectionCount = computed(() => store.selectedIds.size);
const isUngroupMode = computed(() => store.soleSelection?.type === "group");
const groupButtonVisible = computed(() => isUngroupMode.value || selectionCount.value >= 2);

const zoomPercent = computed(() => (store.zoomMode === "fit" ? null : Math.round((store.zoomMode as number) * 100)));

const primitiveTools: { tool: OverlayTool; icon: string; label: string }[] = [
  { tool: "image", icon: "image", label: "Image" },
  { tool: "icon", icon: "star", label: "Icône" },
  { tool: "shape", icon: "category", label: "Forme" },
  { tool: "video", icon: "videocam", label: "Vidéo" },
  { tool: "embed", icon: "link", label: "Depuis un lien" }
];

function pickTool(tool: OverlayTool): void {
  addMenu.close();
  store.setTool(tool);
}

function openItemPicker(): void {
  addMenu.close();
  itemPickerRef.value?.open(projectId.value);
}

// "Nouveau widget"/"Nouvelle alerte" : ouvre le dialogue de création
// habituel (celui du tableau de bord), mais pose un callback consommé par
// WidgetSettingsDialog juste après une création réussie — le nouvel
// item rejoint aussitôt le canevas, comme côté vanille (creatingWidgetForOverlay).
function createAndPlace(type: "widget" | "alert"): void {
  addMenu.close();
  pendingOverlayWidgetPlacement.value = (entry: LibraryEntry) => {
    void store.addWidgetItem(entry.id, entry.type === "alert");
  };
  widgetDialog.value?.openCreate(type, projectId.value);
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
      <span class="material-symbols-sharp" aria-hidden="true">drag_indicator</span>
    </button>

    <div class="overlay-toolbar__group" role="radiogroup" aria-label="Outil">
      <button
        type="button"
        class="overlay-toolbar__button"
        :class="{ 'is-active': store.tool === 'select' }"
        :aria-pressed="store.tool === 'select'"
        title="Sélection"
        aria-label="Sélection"
        @click="store.setTool('select')"
      >
        <span class="material-symbols-sharp" aria-hidden="true">arrow_selector_tool</span>
      </button>
      <button
        type="button"
        class="overlay-toolbar__button"
        :class="{ 'is-active': store.tool === 'text' }"
        :aria-pressed="store.tool === 'text'"
        title="Texte"
        aria-label="Texte"
        @click="pickTool('text')"
      >
        <span class="material-symbols-sharp" aria-hidden="true">title</span>
      </button>
      <button
        type="button"
        class="overlay-toolbar__button"
        :class="{ 'is-active': store.tool === 'eyedropper' }"
        :aria-pressed="store.tool === 'eyedropper'"
        title="Pipette de style (texte)"
        aria-label="Pipette de style (texte)"
        @click="pickTool('eyedropper')"
      >
        <span class="material-symbols-sharp" aria-hidden="true">colorize</span>
      </button>

      <div class="overlay-toolbar__add" :ref="addMenu.containerEl">
        <button type="button" class="overlay-toolbar__button" aria-label="Ajouter un élément" title="Ajouter un élément" @click.stop="addMenu.toggle">
          <span class="material-symbols-sharp" aria-hidden="true">add</span>
          <span>Ajouter</span>
          <span class="material-symbols-sharp overlay-toolbar__add-chevron" aria-hidden="true">expand_more</span>
        </button>
        <div class="overlay-toolbar__add-panel" role="menu" :hidden="!addMenu.open.value">
          <button type="button" class="overlay-toolbar__add-item" role="menuitem" @click="openItemPicker">
            <span class="material-symbols-sharp" aria-hidden="true">widgets</span><span>Widget / Alerte</span>
          </button>
          <button type="button" class="overlay-toolbar__add-item" role="menuitem" @click="createAndPlace('widget')">
            <span class="material-symbols-sharp" aria-hidden="true">add_circle</span><span>Nouveau widget</span>
          </button>
          <button type="button" class="overlay-toolbar__add-item" role="menuitem" @click="createAndPlace('alert')">
            <span class="material-symbols-sharp" aria-hidden="true">add_circle</span><span>Nouvelle alerte</span>
          </button>
          <div class="overlay-toolbar__add-divider" role="separator"></div>
          <button v-for="item in primitiveTools" :key="item.tool" type="button" class="overlay-toolbar__add-item" role="menuitem" @click="pickTool(item.tool)">
            <span class="material-symbols-sharp" aria-hidden="true">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Section entière (grouper/dupliquer/supprimer/alignement/distribution)
    conditionnée sur selectionCount >= 1, séparateurs compris : sans ça, les
    boutons se masquent individuellement via :hidden mais les séparateurs
    (toujours rendus) restent visibles de part et d'autre d'une section
    entièrement vide, créant un large vide qui ressemble à un doublon plutôt
    qu'à un simple espacement. Un seul séparateur (juste avant "Repères" plus
    bas, toujours rendu) suffit alors à marquer la limite entre "Ajouter" et
    "Repères" quand rien n'est sélectionné. -->
    <template v-if="selectionCount >= 1">
      <div class="overlay-toolbar__divider"></div>

      <button
        type="button"
        class="overlay-toolbar__button"
        :hidden="!groupButtonVisible"
        :title="isUngroupMode ? 'Dégrouper' : 'Grouper la sélection'"
        :aria-label="isUngroupMode ? 'Dégrouper' : 'Grouper la sélection'"
        @click="onGroupClick"
      >
        <span class="material-symbols-sharp" aria-hidden="true">{{ isUngroupMode ? "call_split" : "select_all" }}</span>
      </button>
      <button type="button" class="icon-button" title="Dupliquer" aria-label="Dupliquer" @click="store.duplicateSelected">
        <span class="material-symbols-sharp" aria-hidden="true">content_copy</span>
      </button>
      <button type="button" class="icon-button" title="Supprimer" aria-label="Supprimer" @click="store.deleteSelected">
        <span class="material-symbols-sharp" aria-hidden="true">delete</span>
      </button>

      <div class="overlay-toolbar__divider"></div>

      <div class="overlay-toolbar__group" role="group" aria-label="Alignement">
        <button type="button" class="icon-button" title="Aligner à gauche" aria-label="Aligner à gauche" @click="align('left')">
          <span class="material-symbols-sharp" aria-hidden="true">align_horizontal_left</span>
        </button>
        <button type="button" class="icon-button" title="Centrer horizontalement" aria-label="Centrer horizontalement" @click="align('hcenter')">
          <span class="material-symbols-sharp" aria-hidden="true">align_horizontal_center</span>
        </button>
        <button type="button" class="icon-button" title="Aligner à droite" aria-label="Aligner à droite" @click="align('right')">
          <span class="material-symbols-sharp" aria-hidden="true">align_horizontal_right</span>
        </button>
        <button type="button" class="icon-button" title="Aligner en haut" aria-label="Aligner en haut" @click="align('top')">
          <span class="material-symbols-sharp" aria-hidden="true">align_vertical_top</span>
        </button>
        <button type="button" class="icon-button" title="Centrer verticalement" aria-label="Centrer verticalement" @click="align('vcenter')">
          <span class="material-symbols-sharp" aria-hidden="true">align_vertical_center</span>
        </button>
        <button type="button" class="icon-button" title="Aligner en bas" aria-label="Aligner en bas" @click="align('bottom')">
          <span class="material-symbols-sharp" aria-hidden="true">align_vertical_bottom</span>
        </button>
        <button
          type="button"
          class="icon-button"
          title="Centrer horizontalement et verticalement"
          aria-label="Centrer horizontalement et verticalement"
          @click="store.centerSelectionInCanvas"
        >
          <span class="material-symbols-sharp" aria-hidden="true">filter_center_focus</span>
        </button>
      </div>

      <template v-if="selectionCount >= 3">
        <div class="overlay-toolbar__divider"></div>

        <div class="overlay-toolbar__group" role="group" aria-label="Distribution">
          <button type="button" class="icon-button" title="Distribuer horizontalement" aria-label="Distribuer horizontalement" @click="distribute('horizontal')">
            <span class="material-symbols-sharp" aria-hidden="true">horizontal_distribute</span>
          </button>
          <button type="button" class="icon-button" title="Distribuer verticalement" aria-label="Distribuer verticalement" @click="distribute('vertical')">
            <span class="material-symbols-sharp" aria-hidden="true">vertical_distribute</span>
          </button>
        </div>
      </template>
    </template>

    <div class="overlay-toolbar__divider"></div>

    <button
      type="button"
      class="overlay-toolbar__button overlay-toolbar__button--guides"
      :class="{ 'is-active': store.guidesVisible }"
      :aria-pressed="store.guidesVisible"
      title="Règles et repères"
      aria-label="Règles et repères"
      @click="store.setGuidesVisible(!store.guidesVisible)"
    >
      <span class="material-symbols-sharp" aria-hidden="true">straighten</span>
      <span>Repères</span>
    </button>

    <div class="overlay-toolbar__divider"></div>

    <div class="overlay-toolbar__zoom" role="group" aria-label="Zoom">
      <button type="button" class="icon-button" title="Zoom arrière" aria-label="Zoom arrière" @click="onZoomStep(-1)">
        <span class="material-symbols-sharp" aria-hidden="true">remove</span>
      </button>
      <button type="button" class="overlay-toolbar__zoom-label" title="Ajuster à la fenêtre" @click="store.setZoomMode('fit')">
        {{ zoomPercent === null ? "Ajuster" : `${zoomPercent}%` }}
      </button>
      <button type="button" class="icon-button" title="Zoom avant" aria-label="Zoom avant" @click="onZoomStep(1)">
        <span class="material-symbols-sharp" aria-hidden="true">add</span>
      </button>
    </div>

    <div class="overlay-toolbar__divider"></div>

    <button type="button" class="icon-button" :disabled="!store.canUndo" title="Annuler (Ctrl+Z)" aria-label="Annuler" @click="store.undo">
      <span class="material-symbols-sharp" aria-hidden="true">undo</span>
    </button>
    <button type="button" class="icon-button" :disabled="!store.canRedo" title="Rétablir (Ctrl+Y)" aria-label="Rétablir" @click="store.redo">
      <span class="material-symbols-sharp" aria-hidden="true">redo</span>
    </button>
  </div>

  <OverlayItemPickerDialog ref="itemPickerRef" />
</template>
