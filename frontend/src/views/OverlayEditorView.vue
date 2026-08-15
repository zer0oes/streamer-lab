<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { useOverlayEditorStore } from "../stores/overlayEditor";
import OverlayCanvas from "../components/OverlayCanvas.vue";
import OverlayToolbar from "../components/OverlayToolbar.vue";
import LayersPanel from "../components/LayersPanel.vue";

const store = useOverlayEditorStore();

function onKeydown(event: KeyboardEvent): void {
  const active = document.activeElement as HTMLElement | null;
  if (active?.isContentEditable || active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || active?.tagName === "SELECT") return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
    event.preventDefault();
    store.undo();
  } else if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
    event.preventDefault();
    store.redo();
  } else if ((event.ctrlKey || event.metaKey) && key === "d") {
    event.preventDefault();
    store.duplicateSelected();
  } else if (key === "delete" || key === "backspace") {
    if (store.selectedIds.size > 0) {
      event.preventDefault();
      store.deleteSelected();
    }
  } else if (key === "escape") {
    store.clearSelection();
  }
}

document.addEventListener("keydown", onKeydown);
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  void store.flushPersist();
  store.close();
});
</script>

<template>
  <div id="overlay-editor-view" class="overlay-editor">
    <div class="overlay-editor__toolbar">
      <div class="overlay-editor__heading">
        <h2>{{ store.overlay?.name }}</h2>
        <span class="hint">{{ store.canvas.width }} × {{ store.canvas.height }}</span>
      </div>
    </div>

    <div class="overlay-editor__body">
      <OverlayCanvas>
        <template #toolbar>
          <OverlayToolbar />
        </template>
      </OverlayCanvas>
    </div>

    <LayersPanel />
  </div>
</template>
