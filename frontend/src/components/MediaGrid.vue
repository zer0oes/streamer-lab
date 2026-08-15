<script setup lang="ts">
import { computed, ref } from "vue";
import { useMediaStore } from "../stores/media";
import { useToast } from "../composables/useToast";

interface DisplayItem {
  source: "local" | "streamelements";
  type: "image" | "video";
  url: string;
  name: string;
  id?: string;
}

const mediaStore = useMediaStore();
const { showToast } = useToast();
const emit = defineEmits<{ preview: [item: DisplayItem] }>();

const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const items = computed<DisplayItem[]>(() => [
  ...mediaStore.localMedia.map((media) => ({ source: "local" as const, type: media.type, url: media.url, name: media.name, id: media.id })),
  ...mediaStore.remoteMedia.map((media) => ({
    source: "streamelements" as const,
    type: media.type,
    url: media.url,
    name: media.overlayName ? `Depuis l'overlay "${media.overlayName}"` : media.url
  }))
]);

async function handleFiles(files: FileList | null): Promise<void> {
  if (!files) return;
  for (const file of Array.from(files)) {
    try {
      await mediaStore.upload(file);
    } catch (error) {
      showToast(`Import impossible : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function onDrop(event: DragEvent): void {
  isDragOver.value = false;
  void handleFiles(event.dataTransfer?.files ?? null);
}

function onFileInputChange(event: Event): void {
  void handleFiles((event.target as HTMLInputElement).files);
  (event.target as HTMLInputElement).value = "";
}

async function copyUrl(item: DisplayItem): Promise<void> {
  await navigator.clipboard.writeText(item.url);
  showToast("URL copiée dans le presse-papiers");
}

async function removeItem(item: DisplayItem, event: Event): Promise<void> {
  event.stopPropagation();
  if (!item.id) return;
  if (!window.confirm(`Supprimer « ${item.name} » ?`)) return;
  try {
    await mediaStore.remove(item.id);
    showToast("Média supprimé");
  } catch (error) {
    showToast(`Suppression impossible : ${error instanceof Error ? error.message : String(error)}`);
  }
}

function openPreview(item: DisplayItem, event: Event): void {
  event.stopPropagation();
  emit("preview", item);
}
</script>

<template>
  <div class="media-library">
    <label
      class="media-library__dropzone"
      :class="{ 'is-dragover': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <span class="material-symbols-rounded" aria-hidden="true">upload</span>
      <span class="media-library__dropzone-text">Glisser un média ici, ou cliquer pour parcourir</span>
      <input ref="fileInput" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden @change="onFileInputChange" />
    </label>

    <p v-if="!items.length" class="media-library__empty">Aucun média pour l’instant.</p>

    <div v-for="item in items" :key="item.id ?? item.url" class="media-library__item-wrap">
      <button type="button" class="media-library__item" :title="item.name" @click="copyUrl(item)">
        <span class="media-library__thumb-frame">
          <video v-if="item.type === 'video'" class="media-library__thumb media-library__thumb--video" :src="item.url" muted preload="metadata"></video>
          <img v-else class="media-library__thumb" :src="item.url" alt="" loading="lazy" />
          <span v-if="item.type === 'video'" class="media-library__play-badge">
            <span class="material-symbols-rounded" aria-hidden="true">play_circle</span>
          </span>
        </span>
        <span class="media-library__label">{{ item.name }}</span>
      </button>
      <button type="button" class="icon-button media-library__zoom" aria-label="Agrandir" @click="openPreview(item, $event)">
        <span class="material-symbols-rounded" aria-hidden="true">zoom_in</span>
      </button>
      <button
        v-if="item.source === 'local'"
        type="button"
        class="icon-button media-library__delete"
        aria-label="Supprimer"
        @click="removeItem(item, $event)"
      >
        <span class="material-symbols-rounded" aria-hidden="true">delete</span>
      </button>
    </div>
  </div>
</template>
