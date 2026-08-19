<script setup lang="ts">
import { computed } from "vue";
import type { LibraryEntry, OverlayEntry, Project } from "../api/types";
import LibraryRow from "./LibraryRow.vue";
import { widgetDialog, overlayDialog } from "../composables/useDialogs";

const props = withDefaults(
  defineProps<{
    kind: "widget" | "overlay" | "alert";
    icon: string;
    label: string;
    entries: (LibraryEntry | OverlayEntry)[];
    projects: Project[];
    emptyMessage: string;
    addLabel: string;
    openByDefault?: boolean;
  }>(),
  { openByDefault: false }
);

const rowKind = computed<"widget" | "overlay">(() => (props.kind === "overlay" ? "overlay" : "widget"));

function addNew(): void {
  const defaultProjectId = props.projects[0]?.id;
  if (props.kind === "overlay") overlayDialog.value?.openCreate(defaultProjectId);
  else widgetDialog.value?.openCreate(props.kind === "alert" ? "alert" : "widget", defaultProjectId);
}
</script>

<template>
  <details class="library-group" :open="openByDefault">
    <summary class="library-group__summary">
      <span class="material-symbols-sharp" aria-hidden="true">{{ icon }}</span>
      <span class="library-group__label">{{ label }}</span>
      <span class="library-group__count">{{ entries.length }}</span>
      <span class="material-symbols-sharp library-group__chevron" aria-hidden="true">expand_more</span>
    </summary>
    <div class="library-group__body">
      <div class="widget-library">
        <LibraryRow v-for="entry in entries" :key="entry.id" :kind="rowKind" :entry="entry" />
        <p v-if="!entries.length" class="widget-library__empty">{{ emptyMessage }}</p>
      </div>
      <button type="button" class="button button--wide widget-library__add" @click="addNew">
        <span class="material-symbols-sharp" aria-hidden="true">add</span>
        <span>{{ addLabel }}</span>
      </button>
    </div>
  </details>
</template>
