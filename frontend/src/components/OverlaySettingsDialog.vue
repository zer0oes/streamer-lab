<script setup lang="ts">
import { ref } from "vue";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useToast } from "../composables/useToast";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";
import { OVERLAY_ICON_CHOICES } from "../constants/icons";
import IconPicker from "./IconPicker.vue";
import type { OverlayEntry } from "../api/types";

const DEFAULT_CANVAS = { width: 1920, height: 1080 };

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
const { showToast } = useToast();

const dialogEl = ref<HTMLDialogElement | null>(null);
const mode = ref<"create" | "edit">("create");
const editingId = ref<string | null>(null);
const name = ref("");
const description = ref("");
const icon = ref("desktop_landscape");
const width = ref(DEFAULT_CANVAS.width);
const height = ref(DEFAULT_CANVAS.height);
const projectId = ref("");
const projectLocked = ref(false);
const message = ref("");
const messageState = ref<"" | "error" | "success">("");
const saving = ref(false);

function close(): void {
  dialogEl.value?.close();
}

const { onMousedown, onClick } = useDialogBackdropClose(dialogEl, close);

function reset(): void {
  message.value = "";
  messageState.value = "";
}

function applyRatio(ratio: "16:9" | "9:16"): void {
  [width.value, height.value] = ratio === "9:16" ? [1080, 1920] : [1920, 1080];
}

function openCreate(defaultProjectId?: string): void {
  mode.value = "create";
  editingId.value = null;
  name.value = "";
  description.value = "";
  icon.value = "desktop_landscape";
  width.value = DEFAULT_CANVAS.width;
  height.value = DEFAULT_CANVAS.height;
  projectId.value = defaultProjectId || projectsStore.projects[0]?.id || "";
  projectLocked.value = false;
  reset();
  dialogEl.value?.showModal();
}

function openEdit(entry: OverlayEntry): void {
  mode.value = "edit";
  editingId.value = entry.id;
  name.value = entry.name;
  description.value = entry.description;
  icon.value = entry.icon || "desktop_landscape";
  width.value = entry.canvas?.width ?? DEFAULT_CANVAS.width;
  height.value = entry.canvas?.height ?? DEFAULT_CANVAS.height;
  projectId.value = entry.projectId;
  projectLocked.value = true;
  reset();
  dialogEl.value?.showModal();
}

defineExpose({ openCreate, openEdit });

async function save(): Promise<void> {
  const trimmedName = name.value.trim();
  if (!trimmedName) return;

  saving.value = true;
  message.value = mode.value === "create" ? "Création en cours…" : "Enregistrement en cours…";
  messageState.value = "";
  try {
    const input = { name: trimmedName, description: description.value.trim(), icon: icon.value, width: width.value, height: height.value };
    if (mode.value === "create") {
      const overlay = await libraryStore.addOverlay(input, projectId.value);
      showToast(`${overlay.name} créé`);
    } else if (editingId.value) {
      await libraryStore.updateOverlay(editingId.value, input);
      showToast("Informations de l’overlay enregistrées");
    }
    close();
  } catch (error) {
    messageState.value = "error";
    message.value = error instanceof Error ? error.message : String(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <dialog ref="dialogEl" class="widget-settings" aria-labelledby="overlay-settings-title" @mousedown="onMousedown" @click="onClick">
    <form class="widget-settings__form" @submit.prevent="save">
      <header class="widget-settings__header">
        <div>
          <span class="eyebrow">OVERLAYS</span>
          <h2 id="overlay-settings-title">{{ mode === "create" ? "Nouvel overlay" : "Modifier l’overlay" }}</h2>
        </div>
        <button type="button" class="icon-button" aria-label="Fermer" @click="close">
          <span class="material-symbols-rounded" aria-hidden="true">close_small</span>
        </button>
      </header>
      <div class="widget-settings__body">
        <label class="field">
          <span class="field__label">Nom</span>
          <input v-model="name" maxlength="60" required autocomplete="off" />
        </label>
        <label class="field">
          <span class="field__label">Projet</span>
          <select v-model="projectId" required :disabled="projectLocked">
            <option v-for="project in projectsStore.projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Description</span>
          <textarea v-model="description" rows="3" maxlength="140"></textarea>
        </label>
        <fieldset class="widget-icon-field">
          <legend>Dimensions</legend>
          <div class="overlay-canvas-size">
            <div class="overlay-canvas-size__ratios">
              <button type="button" class="button button--quiet" @click="applyRatio('16:9')">16:9</button>
              <button type="button" class="button button--quiet" @click="applyRatio('9:16')">9:16</button>
            </div>
            <div class="overlay-canvas-size__inputs">
              <label><span>L</span><input v-model.number="width" type="number" min="100" max="7680" step="1" required /></label>
              <span aria-hidden="true">×</span>
              <label><span>H</span><input v-model.number="height" type="number" min="100" max="7680" step="1" required /></label>
              <span>px</span>
            </div>
          </div>
        </fieldset>
        <fieldset class="widget-icon-field">
          <legend>Icône</legend>
          <IconPicker v-model="icon" :choices="OVERLAY_ICON_CHOICES" />
        </fieldset>
        <p class="widget-settings__message" :class="{ [`is-${messageState}`]: messageState }" role="status" aria-live="polite">
          {{ message }}
        </p>
      </div>
      <footer class="widget-settings__footer">
        <button type="button" class="button button--quiet" @click="close">Annuler</button>
        <button type="submit" class="button button--primary" :disabled="saving">
          {{ mode === "create" ? "Créer" : "Enregistrer" }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
