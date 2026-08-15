<script setup lang="ts">
import { ref } from "vue";
import { useLibraryStore } from "../stores/library";
import { useProjectsStore } from "../stores/projects";
import { useToast } from "../composables/useToast";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";
import { WIDGET_ICON_CHOICES } from "../constants/icons";
import IconPicker from "./IconPicker.vue";
import type { LibraryEntry } from "../api/types";

const DEFAULT_SIZE = { width: 320, height: 180 };

const libraryStore = useLibraryStore();
const projectsStore = useProjectsStore();
const { showToast } = useToast();

const dialogEl = ref<HTMLDialogElement | null>(null);
const mode = ref<"create" | "edit">("create");
const editingId = ref<string | null>(null);
const name = ref("");
const description = ref("");
const icon = ref("widgets");
const type = ref<"widget" | "alert">("widget");
const width = ref(DEFAULT_SIZE.width);
const height = ref(DEFAULT_SIZE.height);
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

function openCreate(defaultType: "widget" | "alert" = "widget", defaultProjectId?: string): void {
  mode.value = "create";
  editingId.value = null;
  name.value = "";
  description.value = "";
  icon.value = defaultType === "alert" ? "celebration" : "widgets";
  type.value = defaultType;
  width.value = DEFAULT_SIZE.width;
  height.value = DEFAULT_SIZE.height;
  projectId.value = defaultProjectId || projectsStore.projects[0]?.id || "";
  projectLocked.value = false;
  reset();
  dialogEl.value?.showModal();
}

function openEdit(entry: LibraryEntry): void {
  mode.value = "edit";
  editingId.value = entry.id;
  name.value = entry.name;
  description.value = entry.description;
  icon.value = entry.icon || "widgets";
  type.value = entry.type;
  width.value = entry.width || DEFAULT_SIZE.width;
  height.value = entry.height || DEFAULT_SIZE.height;
  projectId.value = entry.projectId;
  // Déplacer un widget/alerte vers un autre projet se fait par glisser-
  // déposer (cf. LibraryRow) — le champ affiche juste le projet actuel ici.
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
    const input = {
      name: trimmedName,
      description: description.value.trim(),
      icon: icon.value,
      type: type.value,
      width: width.value,
      height: height.value
    };
    if (mode.value === "create") {
      const widget = await libraryStore.addWidget(input, projectId.value);
      showToast(`${widget.name} créé`);
    } else if (editingId.value) {
      await libraryStore.updateWidget(editingId.value, input);
      showToast("Informations du widget enregistrées");
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
  <dialog ref="dialogEl" class="widget-settings" aria-labelledby="widget-settings-title" @mousedown="onMousedown" @click="onClick">
    <form class="widget-settings__form" @submit.prevent="save">
      <header class="widget-settings__header">
        <div>
          <span class="eyebrow">BIBLIOTHÈQUE</span>
          <h2 id="widget-settings-title">{{ mode === "create" ? (type === "alert" ? "Nouvelle alerte" : "Nouveau widget") : "Modifier le widget" }}</h2>
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
        <fieldset class="widget-type-field">
          <legend>Type</legend>
          <div class="widget-type-switch" role="group" aria-label="Type de widget">
            <button
              type="button"
              class="widget-type-switch__button"
              :class="{ 'is-active': type === 'widget' }"
              :aria-pressed="type === 'widget'"
              @click="type = 'widget'"
            >
              <span class="material-symbols-rounded" aria-hidden="true">widgets</span>
              <span>Widget</span>
            </button>
            <button
              type="button"
              class="widget-type-switch__button"
              :class="{ 'is-active': type === 'alert' }"
              :aria-pressed="type === 'alert'"
              @click="type = 'alert'"
            >
              <span class="material-symbols-rounded" aria-hidden="true">campaign</span>
              <span>Alerte</span>
            </button>
          </div>
        </fieldset>
        <label class="field">
          <span class="field__label">Description</span>
          <textarea v-model="description" rows="3" maxlength="140"></textarea>
        </label>
        <fieldset class="widget-icon-field">
          <legend>Taille par défaut</legend>
          <div class="overlay-canvas-size">
            <div class="overlay-canvas-size__inputs">
              <label><span>L</span><input v-model.number="width" type="number" min="8" max="4096" step="1" required /></label>
              <span aria-hidden="true">×</span>
              <label><span>H</span><input v-model.number="height" type="number" min="8" max="4096" step="1" required /></label>
              <span>px</span>
            </div>
          </div>
          <p class="widget-settings__hint">Taille utilisée à l’ajout sur un overlay — modifiable ensuite au cas par cas sur le canevas.</p>
        </fieldset>
        <fieldset class="widget-icon-field">
          <legend>Icône</legend>
          <IconPicker v-model="icon" :choices="WIDGET_ICON_CHOICES" />
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
