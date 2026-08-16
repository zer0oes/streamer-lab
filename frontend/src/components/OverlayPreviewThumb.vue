<script setup lang="ts">
import { computed } from "vue";
import type { OverlayEntry } from "../api/types";
import type { OverlayItem } from "../lib/overlayTypes";
import { DEFAULT_OVERLAY_CANVAS } from "../lib/overlayTypes";
import { overlayPreviewItemIcon } from "../lib/overlayItems";
import { useLibraryStore } from "../stores/library";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import { setActiveView } from "../composables/useAppView";

const props = defineProps<{ entry: OverlayEntry }>();

const libraryStore = useLibraryStore();
const overlayEditorStore = useOverlayEditorStore();

const canvas = computed(() => props.entry.canvas || DEFAULT_OVERLAY_CANVAS);
const visibleItems = computed(() => props.entry.items.filter((item) => item.type !== "group"));

function widgetIcon(widgetId: string): string | undefined {
  return libraryStore.widgets.find((entry) => entry.id === widgetId)?.icon;
}

function itemStyle(item: OverlayItem) {
  return {
    left: `${(item.x / canvas.value.width) * 100}%`,
    top: `${(item.y / canvas.value.height) * 100}%`,
    width: `${(item.w / canvas.value.width) * 100}%`,
    height: `${(item.h / canvas.value.height) * 100}%`
  };
}

function shapeStyle(item: OverlayItem) {
  const shapeProps = (item.props as { fill?: string; stroke?: string; shape?: string } | undefined) || {};
  return {
    background: shapeProps.fill || "#7c5cff",
    borderColor: shapeProps.stroke && shapeProps.stroke !== "transparent" ? shapeProps.stroke : "transparent",
    borderRadius: shapeProps.shape === "ellipse" ? "50%" : undefined
  };
}

async function open(): Promise<void> {
  await overlayEditorStore.open(props.entry.id);
  setActiveView("overlay");
}
</script>

<template>
  <button
    type="button"
    class="overlay-preview-card__thumb"
    :style="{ aspectRatio: `${canvas.width} / ${canvas.height}` }"
    :aria-label="`Ouvrir l’overlay ${entry.name}`"
    @click="open"
  >
    <span v-for="item in visibleItems" :key="item.id" class="overlay-preview-card__item" :style="item.type === 'shape' ? { ...itemStyle(item), ...shapeStyle(item) } : itemStyle(item)">
      <span v-if="item.type !== 'shape'" class="material-symbols-rounded" aria-hidden="true">{{ overlayPreviewItemIcon(item, widgetIcon) }}</span>
    </span>
    <img
      v-if="entry.sourcePlatform"
      class="overlay-preview-card__badge"
      :src="`/assets/platforms/${entry.sourcePlatform}.svg`"
      :alt="entry.sourcePlatform === 'streamlabs' ? 'Importé depuis Streamlabs' : 'Importé depuis StreamElements'"
      :title="entry.sourcePlatform === 'streamlabs' ? 'Importé depuis Streamlabs' : 'Importé depuis StreamElements'"
    />
  </button>
</template>
