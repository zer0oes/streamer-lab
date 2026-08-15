<script setup lang="ts">
import { ref } from "vue";
import { useProjectsStore } from "../stores/projects";
import { useLibraryStore } from "../stores/library";
import { useToast } from "../composables/useToast";
import { useDialogBackdropClose } from "../composables/useDialogBackdropClose";
import { PROJECT_ICON_CHOICES } from "../constants/icons";
import IconPicker from "./IconPicker.vue";
import type { Project } from "../api/types";

const projectsStore = useProjectsStore();
const libraryStore = useLibraryStore();
const { showToast } = useToast();

const dialogEl = ref<HTMLDialogElement | null>(null);
const mode = ref<"create" | "edit">("create");
const editingId = ref<string | null>(null);
const name = ref("");
const description = ref("");
const icon = ref("folder");
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

function openCreate(): void {
  mode.value = "create";
  editingId.value = null;
  name.value = "";
  description.value = "";
  icon.value = "folder";
  reset();
  dialogEl.value?.showModal();
}

function openEdit(project: Project): void {
  mode.value = "edit";
  editingId.value = project.id;
  name.value = project.name;
  description.value = project.description;
  icon.value = project.icon || "folder";
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
    const input = { name: trimmedName, description: description.value.trim(), icon: icon.value };
    if (mode.value === "create") {
      const project = await projectsStore.create(input);
      showToast(`${project.name} créé`);
    } else if (editingId.value) {
      await projectsStore.update(editingId.value, input);
      showToast("Projet enregistré");
    }
    close();
  } catch (error) {
    messageState.value = "error";
    message.value = error instanceof Error ? error.message : String(error);
  } finally {
    saving.value = false;
  }
}

async function removeProject(): Promise<void> {
  if (!editingId.value) return;
  const project = projectsStore.projects.find((entry) => entry.id === editingId.value);
  if (!project) return;
  const counts = libraryStore.entriesForProject(project.id);
  const itemCount = counts.widgets.length + counts.alerts.length + counts.overlays.length;
  const warning = itemCount
    ? `Supprimer le projet « ${project.name} » supprimera aussi ${itemCount} overlay(s)/widget(s)/alerte(s) qu'il contient. Cette action est irréversible.`
    : `Supprimer définitivement le projet « ${project.name} » ? Cette action est irréversible.`;
  if (!window.confirm(warning)) return;

  try {
    await projectsStore.remove(project.id);
    libraryStore.removeAllForProject(project.id);
    showToast(`Projet « ${project.name} » supprimé`);
    close();
  } catch (error) {
    messageState.value = "error";
    message.value = error instanceof Error ? error.message : String(error);
  }
}
</script>

<template>
  <dialog ref="dialogEl" class="widget-settings" aria-labelledby="project-settings-title" @mousedown="onMousedown" @click="onClick">
    <form class="widget-settings__form" @submit.prevent="save">
      <header class="widget-settings__header">
        <div>
          <span class="eyebrow">BIBLIOTHÈQUE</span>
          <h2 id="project-settings-title">{{ mode === "create" ? "Nouveau projet" : "Modifier le projet" }}</h2>
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
          <span class="field__label">Description</span>
          <textarea v-model="description" rows="3" maxlength="140"></textarea>
        </label>
        <fieldset class="widget-icon-field">
          <legend>Icône</legend>
          <IconPicker v-model="icon" :choices="PROJECT_ICON_CHOICES" />
        </fieldset>
        <p class="widget-settings__message" :class="{ [`is-${messageState}`]: messageState }" role="status" aria-live="polite">
          {{ message }}
        </p>
      </div>
      <footer class="widget-settings__footer">
        <button
          v-if="mode === 'edit'"
          type="button"
          class="button button--quiet is-danger"
          :hidden="projectsStore.projects.length <= 1"
          @click="removeProject"
        >
          Supprimer le projet
        </button>
        <button type="button" class="button button--quiet" @click="close">Annuler</button>
        <button type="submit" class="button button--primary" :disabled="saving">
          {{ mode === "create" ? "Créer" : "Enregistrer" }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
