<script setup lang="ts">
import { computed, ref } from "vue";
import { useWidgetEditorStore } from "../stores/widgetEditor";
import { useDropdownToggle } from "../composables/useDropdownToggle";
import { useToast } from "../composables/useToast";
import { PLATFORM_STREAM_ELEMENTS, PLATFORM_STREAMLABS } from "../lib/platformEvents";
import { buildPlatformExport, slugifyWidgetName } from "../lib/widgetExport";
import { createZip } from "../lib/zip";

const store = useWidgetEditorStore();
const menu = useDropdownToggle();
const { showToast } = useToast();
const busy = ref(false);

const otherPlatformLabel = computed(() => (store.platform === PLATFORM_STREAMLABS ? "StreamElements" : "Streamlabs"));

async function exportFor(targetPlatform: string): Promise<void> {
  menu.close();
  if (!store.detail || busy.value) return;
  busy.value = true;
  try {
    await store.flushDirtyFiles();
    const exported = buildPlatformExport(
      { html: store.editorFiles.html, css: store.editorFiles.css, js: store.editorFiles.js, fields: store.fields },
      store.fieldData,
      targetPlatform
    );
    const archive = createZip(exported.files);
    const slug = slugifyWidgetName(store.detail.widgetMeta.name || "custom-widget");
    const suffix = exported.platform === PLATFORM_STREAMLABS ? "streamlabs" : "streamelements";
    const blob = new Blob([archive], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}-${suffix}.zip`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    const bridge = exported.bridgeInjected ? " · pont de compatibilité inclus" : "";
    showToast(`Export ${exported.platformName} téléchargé${bridge}`);
  } finally {
    busy.value = false;
  }
}

function downloadCurrent(): void {
  void exportFor(store.platform);
}

function convertToOther(): void {
  void exportFor(store.platform === PLATFORM_STREAMLABS ? PLATFORM_STREAM_ELEMENTS : PLATFORM_STREAMLABS);
}
</script>

<template>
  <div class="export-menu" :ref="menu.containerEl">
    <button
      type="button"
      class="export-menu__trigger"
      aria-haspopup="menu"
      :aria-expanded="menu.open.value"
      :disabled="busy"
      @click="menu.toggle"
    >
      <span class="material-symbols-sharp" aria-hidden="true">download</span>
      <span>Exporter</span>
      <span class="material-symbols-sharp export-menu__chevron" aria-hidden="true">expand_more</span>
    </button>
    <div class="export-menu__panel" role="menu" :hidden="!menu.open.value">
      <button type="button" class="export-menu__item" role="menuitem" @click="downloadCurrent">
        <span class="material-symbols-sharp" aria-hidden="true">download</span>
        <span>Télécharger</span>
      </button>
      <button type="button" class="export-menu__item" role="menuitem" @click="convertToOther">
        <span class="material-symbols-sharp" aria-hidden="true">sync_alt</span>
        <span>Convertir pour {{ otherPlatformLabel }}</span>
      </button>
    </div>
  </div>
</template>
