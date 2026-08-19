<script setup lang="ts">
// Port du sélecteur "Widget / Alerte" ouvert par le menu Ajouter (cf.
// openOverlayItemPicker/addOverlayItem, app.js) : liste les widgets/alertes
// EXISTANTS du même projet que l'overlay, en placer un sur le canevas via
// store.addWidgetItem (même logique de cascade/placement que le reste de
// l'app, cf. lib/overlayItems.ts).
import { computed, ref } from "vue";
import { useLibraryStore } from "../stores/library";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";
import type { LibraryEntry } from "../api/types";

const libraryStore = useLibraryStore();
const store = useOverlayEditorStore();

const dialogEl = ref<HTMLDialogElement | null>(null);
const projectId = ref("");

function close(): void {
  dialogEl.value?.close();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

function open(forProjectId: string): void {
  projectId.value = forProjectId;
  dialogEl.value?.showModal();
}

defineExpose({ open });

const entries = computed<LibraryEntry[]>(() => {
  const { widgets, alerts } = libraryStore.entriesForProject(projectId.value);
  return [...widgets, ...alerts];
});

async function pick(entry: LibraryEntry): Promise<void> {
  await store.addWidgetItem(entry.id, entry.type === "alert");
  close();
}
</script>

<template>
  <dialog ref="dialogEl" class="widget-settings" aria-labelledby="overlay-item-picker-title" @mousedown="onMousedown" @click="onClick">
    <header class="widget-settings__header">
      <div>
        <span class="eyebrow">OVERLAY</span>
        <h2 id="overlay-item-picker-title">Widget / Alerte</h2>
      </div>
      <button type="button" class="icon-button" aria-label="Fermer" @click="close">
        <span class="material-symbols-sharp" aria-hidden="true">close_small</span>
      </button>
    </header>
    <div class="widget-settings__body">
      <button v-for="entry in entries" :key="entry.id" type="button" class="overlay-toolbar__add-item" @click="pick(entry)">
        <span class="material-symbols-sharp" aria-hidden="true">{{ entry.icon }}</span>
        <span>{{ entry.name }}</span>
      </button>
      <p v-if="entries.length === 0" class="hint">Aucun widget ou alerte dans ce projet.</p>
    </div>
  </dialog>
</template>
