<script setup lang="ts">
import { computed, ref } from "vue";
import { useMediaStore } from "../stores/media";
import { useDashboardLibraryStore, DASHBOARD_MEDIA_PAGE_SIZE } from "../stores/dashboardLibrary";
import { paginate } from "../lib/libraryFilter";
import { useToast } from "../composables/useToast";

interface DisplayItem {
  source: "local" | "streamelements";
  type: "image" | "video";
  url: string;
  name: string;
  id?: string;
}

// Deux instances de ce composant existent (panneau Médias complet de la
// sidebar, et bloc du dashboard) : seule celle du dashboard est paginée
// (cf. DASHBOARD_MEDIA_PAGE_SIZE) — la sidebar reste une liste unique.
const props = withDefaults(defineProps<{ paginated?: boolean }>(), { paginated: false });

const mediaStore = useMediaStore();
const dashboardLibrary = useDashboardLibraryStore();
const { showToast } = useToast();
const emit = defineEmits<{ preview: [item: DisplayItem] }>();

const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const allItems = computed<DisplayItem[]>(() => [
  ...mediaStore.localMedia.map((media) => ({ source: "local" as const, type: media.type, url: media.url, name: media.name, id: media.id })),
  ...mediaStore.remoteMedia.map((media) => ({
    source: "streamelements" as const,
    type: media.type,
    url: media.url,
    name: media.overlayName ? `Depuis l'overlay "${media.overlayName}"` : media.url
  }))
]);

const pagination = computed(() => paginate(allItems.value, dashboardLibrary.mediaPage, DASHBOARD_MEDIA_PAGE_SIZE));
const items = computed<DisplayItem[]>(() => (props.paginated ? pagination.value.pageEntries : allItems.value));

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
      <span class="material-symbols-sharp" aria-hidden="true">upload</span>
      <span class="media-library__dropzone-text">Glisser un média ici, ou cliquer pour parcourir</span>
      <input ref="fileInput" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden @change="onFileInputChange" />
    </label>

    <p v-if="!items.length" class="media-library__empty">Aucun média pour l’instant.</p>

    <div v-for="item in items" :key="item.id ?? item.url" class="media-library__item-wrap">
      <div
        class="media-library__item"
        role="button"
        tabindex="0"
        :title="item.name"
        @click="copyUrl(item)"
        @keydown.enter="copyUrl(item)"
        @keydown.space.prevent="copyUrl(item)"
      >
        <span class="media-library__thumb-frame">
          <video v-if="item.type === 'video'" class="media-library__thumb media-library__thumb--video" :src="item.url" muted preload="metadata"></video>
          <img v-else class="media-library__thumb" :src="item.url" alt="" loading="lazy" />
          <span v-if="item.type === 'video'" class="media-library__play-badge">
            <span class="material-symbols-sharp" aria-hidden="true">play_circle</span>
          </span>
          <!-- Enfants de &__thumb-frame (pas de &__item-wrap) : ancrés en
          position:absolute sur le cadre de la vignette elle-même, pas sur
          toute la carte (qui inclut aussi le nom de fichier en dessous) —
          sinon la loupe (bottom:4px) flottait sous l'image, au niveau du
          bas de la carte plutôt que du coin de la vignette. Nécessite que
          &__item ne soit plus un <button> (un bouton ne peut pas en
          contenir d'autres). -->
          <button type="button" class="icon-button media-library__zoom" aria-label="Agrandir" @click="openPreview(item, $event)">
            <span class="material-symbols-sharp" aria-hidden="true">zoom_in</span>
          </button>
          <button
            v-if="item.source === 'local'"
            type="button"
            class="icon-button media-library__delete"
            aria-label="Supprimer"
            @click="removeItem(item, $event)"
          >
            <span class="material-symbols-sharp" aria-hidden="true">delete</span>
          </button>
        </span>
        <span class="media-library__label">{{ item.name }}</span>
      </div>
    </div>
  </div>

  <!-- Hors de .media-library (grille 3 colonnes) : à l'intérieur, ce bloc
  deviendrait lui-même une cellule de la grille au lieu de s'étendre sur
  toute sa largeur pour se centrer, cf. DashboardLibraryColumn.vue où
  .library-pagination est de la même façon un frère de .widget-library, pas
  un enfant. -->
  <div v-if="paginated" class="library-pagination" :hidden="pagination.pageCount <= 1">
    <button
      type="button"
      class="icon-button"
      aria-label="Page précédente"
      :disabled="pagination.page <= 0"
      @click="dashboardLibrary.setMediaPage(pagination.page - 1)"
    >
      <span class="material-symbols-sharp" aria-hidden="true">chevron_left</span>
    </button>
    <span class="library-pagination__label">{{ pagination.page + 1 }} / {{ pagination.pageCount }}</span>
    <button
      type="button"
      class="icon-button"
      aria-label="Page suivante"
      :disabled="pagination.page >= pagination.pageCount - 1"
      @click="dashboardLibrary.setMediaPage(pagination.page + 1)"
    >
      <span class="material-symbols-sharp" aria-hidden="true">chevron_right</span>
    </button>
  </div>
</template>
