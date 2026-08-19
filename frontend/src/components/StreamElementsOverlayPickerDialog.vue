<script setup lang="ts">
// Port du sélecteur "Importer un overlay" (openStreamElementsOverlayPicker,
// public/app.js) : liste les overlays du compte StreamElements connecté,
// import au clic sur une ligne. L'API/le modèle de données (sourcePlatform,
// badge sur OverlayPreviewThumb, repères non éditables côté éditeur overlay)
// existaient déjà côté Vue ; seul ce déclencheur manquait.
import { ref } from "vue";
import { listStreamElementsOverlays, importStreamElementsOverlay, type StreamElementsOverlaySummary } from "../api/streamelements";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { useToast } from "../composables/useToast";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";
import { setActiveView } from "../composables/useAppView";
import { ApiError } from "../api/client";

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
const overlayEditorStore = useOverlayEditorStore();
const { showToast } = useToast();

const dialogEl = ref<HTMLDialogElement | null>(null);
const overlays = ref<StreamElementsOverlaySummary[]>([]);
const loading = ref(false);
const error = ref("");
const importingId = ref("");

function close(): void {
  dialogEl.value?.close();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

async function open(): Promise<void> {
  dialogEl.value?.showModal();
  loading.value = true;
  error.value = "";
  overlays.value = [];
  try {
    overlays.value = await listStreamElementsOverlays();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : "Erreur inattendue";
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });

async function pick(overlay: StreamElementsOverlaySummary): Promise<void> {
  // Même choix que l'ancien "+ Ajouter" (LibraryGroupSection.addNew) : pas de
  // sélecteur de projet dans ce dialogue, le premier projet sert de défaut —
  // un réimport d'un overlay déjà importé ignore de toute façon ce projet
  // (cf. server.mjs : il retourne dans son projet d'origine).
  const defaultProjectId = projectsStore.projects[0]?.id;
  if (!defaultProjectId) {
    showToast("Crée d’abord un projet pour y importer un overlay.");
    return;
  }
  importingId.value = overlay.id;
  try {
    const result = await importStreamElementsOverlay(overlay.id, defaultProjectId);
    close();
    await libraryStore.refreshOverlays();
    showToast(`Overlay ${result.updated ? "mis à jour" : "importé"} · ${result.placeholders} élément(s) en repère non éditable`);
    await overlayEditorStore.open(result.overlay.id);
    setActiveView("overlay");
  } catch (err) {
    showToast(`Import impossible : ${err instanceof ApiError ? err.message : "Erreur inattendue"}`);
  } finally {
    importingId.value = "";
  }
}
</script>

<template>
  <dialog ref="dialogEl" class="widget-settings" aria-labelledby="streamelements-overlay-picker-title" @mousedown="onMousedown" @click="onClick">
    <div class="widget-settings__form">
      <header class="widget-settings__header">
        <div>
          <span class="eyebrow">STREAMELEMENTS</span>
          <h2 id="streamelements-overlay-picker-title">Importer un overlay</h2>
        </div>
        <button type="button" class="icon-button" aria-label="Fermer" @click="close">
          <span class="material-symbols-sharp" aria-hidden="true">close_small</span>
        </button>
      </header>
      <div class="widget-settings__body">
        <div class="widget-library" aria-label="Overlays StreamElements disponibles">
          <p v-if="loading" class="widget-library__empty">Chargement…</p>
          <p v-else-if="error" class="widget-library__empty">Erreur : {{ error }}</p>
          <p v-else-if="!overlays.length" class="widget-library__empty">Aucun overlay sur ce compte StreamElements.</p>
          <div v-for="overlay in overlays" v-else :key="overlay.id" class="widget-library__row">
            <button type="button" class="widget-library__item" :disabled="importingId === overlay.id" @click="pick(overlay)">
              <span class="widget-library__icon">
                <span class="material-symbols-sharp" aria-hidden="true">desktop_landscape</span>
              </span>
              <span class="widget-library__copy">
                <strong>{{ overlay.name }}</strong>
                <small>{{ importingId === overlay.id ? "Import en cours…" : overlay.widgetCount != null ? `${overlay.widgetCount} élément(s)` : "" }}</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</template>
