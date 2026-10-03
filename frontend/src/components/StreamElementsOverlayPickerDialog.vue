<script setup lang="ts">
// Port du sélecteur "Importer un overlay" (openStreamElementsOverlayPicker,
// public/app.js) : liste les overlays du compte StreamElements connecté,
// import au clic sur une ligne. L'API/le modèle de données (sourcePlatform,
// badge sur OverlayPreviewThumb, repères non éditables côté éditeur overlay)
// existaient déjà côté Vue ; seul ce déclencheur manquait.
import { ref } from "vue";
import {
  listStreamElementsChannels,
  listStreamElementsOverlays,
  importStreamElementsOverlay,
  type StreamElementsChannel,
  type StreamElementsOverlaySummary
} from "../api/streamelements";
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
// Chaînes StreamElements accessibles au compte connecté : la sienne en tête,
// puis celles qu'il gère (cf. /api/integrations/streamelements/channels).
const channels = ref<StreamElementsChannel[]>([]);
const channelId = ref("");
const projectId = ref("");

function close(): void {
  dialogEl.value?.close();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

// Projet de destination proposé : celui qui porte le nom de la chaîne
// (chaîne TomaVega → projet TomaVega), sinon le premier projet. Un réimport
// ignore ce choix : l'overlay reste dans son projet d'origine (cf. server.mjs).
function suggestProject(): void {
  const channelName = channels.value.find((channel) => channel.id === channelId.value)?.name.trim().toLowerCase();
  const match = projectsStore.projects.find((project) => project.name.trim().toLowerCase() === channelName);
  projectId.value = (match ?? projectsStore.projects[0])?.id ?? "";
}

async function loadOverlays(): Promise<void> {
  loading.value = true;
  error.value = "";
  overlays.value = [];
  suggestProject();
  try {
    overlays.value = await listStreamElementsOverlays(channelId.value || undefined);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : "Erreur inattendue";
  } finally {
    loading.value = false;
  }
}

async function open(): Promise<void> {
  dialogEl.value?.showModal();
  if (!channels.value.length) {
    try {
      const result = await listStreamElementsChannels();
      channels.value = result.channels;
      channelId.value = result.defaultChannelId;
    } catch {
      // Chaînes indisponibles : on liste quand même celle du compte connecté
      // (le serveur la prend par défaut sans channelId).
    }
  }
  await loadOverlays();
}

defineExpose({ open });

function channelLabel(channel: StreamElementsChannel): string {
  const provider = channel.provider ? ` · ${channel.provider.charAt(0).toUpperCase()}${channel.provider.slice(1)}` : "";
  return `${channel.name}${provider}${channel.role && channel.role !== "owner" ? ` (${channel.role})` : ""}`;
}

async function pick(overlay: StreamElementsOverlaySummary): Promise<void> {
  if (!projectId.value) {
    showToast("Crée d’abord un projet pour y importer un overlay.");
    return;
  }
  importingId.value = overlay.id;
  try {
    const result = await importStreamElementsOverlay(overlay.id, projectId.value, channelId.value || undefined);
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
        <label v-if="channels.length > 1" class="field">
          <span class="field__label">Chaîne</span>
          <select v-model="channelId" @change="loadOverlays">
            <option v-for="channel in channels" :key="channel.id" :value="channel.id">{{ channelLabel(channel) }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Importer dans le projet</span>
          <select v-model="projectId">
            <option v-for="project in projectsStore.projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </label>
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
