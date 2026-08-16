import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import { getWidgetDetail, saveWidgetFile, type EditorFileKey, type FieldDefinitions, type WidgetDetail } from "../api/widgetDetail";
import { normalizePlatform, type Platform } from "../lib/platformEvents";
import { fieldStorageKey, loadFieldData, normalizeFieldDefinitions } from "../lib/fieldData";
import { buildWidgetSrcdoc, type BuildSrcdocOptions } from "../lib/widgetSrcdoc";

export type FileStatus = "synced" | "dirty" | "saving" | "error";

export interface ConsoleLine {
  level: "log" | "info" | "warn" | "error" | "event";
  message: string;
  time: string;
}

const PREVIEW_PLATFORM_KEY = "se-lab-preview-platform";
// Deux débounces distincts, comme l'app vanille : un court pour rafraîchir
// l'aperçu (evite un rechargement d'iframe à chaque frappe/pixel de slider),
// un plus long pour l'enregistrement réseau.
const APPLY_DEBOUNCE_MS = 150;
const FIELD_APPLY_DEBOUNCE_MS = 120;
const SAVE_DEBOUNCE_MS = 650;

export const useWidgetEditorStore = defineStore("widgetEditor", () => {
  const widgetId = ref<string | null>(null);
  const detail = ref<WidgetDetail | null>(null);
  const platform = ref<Platform>(normalizePlatform(localStorage.getItem(PREVIEW_PLATFORM_KEY)));
  const fields = ref<FieldDefinitions>({});
  // Doit vivre ici (pas juste un ref local à WidgetPreviewFrame.vue) : c'est
  // `srcdoc` ci-dessous qui a besoin de sa valeur pour poser la classe
  // "se-lab-checker" sur le <html> du document iframe — sans quoi le damier
  // du bouton .checker-button (qui, lui, ne pilote que le fond de
  // .preview-shell côté parent) ne s'applique jamais à l'intérieur du
  // document du widget, qui recouvre pourtant toute la zone visible.
  const isChecker = ref(true);

  // fieldData : reflète immédiatement chaque changement de champ (v-model du
  // formulaire) ; previewFieldData : copie débouncée utilisée pour l'aperçu,
  // pour ne pas recharger l'iframe à chaque pixel de slider glissé.
  const fieldData = reactive<Record<string, unknown>>({});
  const previewFieldData = reactive<Record<string, unknown>>({});

  // editorFiles : buffer brut (textarea, surlignage) mis à jour à chaque
  // frappe ; previewSource : copie débouncée utilisée pour l'aperçu.
  const editorFiles = reactive<Record<EditorFileKey, string>>({ html: "", css: "", js: "", fields: "", data: "" });
  const previewSource = reactive<{ html: string; css: string; js: string }>({ html: "", css: "", js: "" });

  const fileStatus = reactive<Record<EditorFileKey, FileStatus>>({ html: "synced", css: "synced", js: "synced", fields: "synced", data: "synced" });
  const fileError = reactive<Record<EditorFileKey, string>>({ html: "", css: "", js: "", fields: "", data: "" });
  const activeFile = ref<EditorFileKey>("html");
  const consoleLines = ref<ConsoleLine[]>([]);
  const loading = ref(false);

  const applyTimers: Partial<Record<EditorFileKey, ReturnType<typeof setTimeout>>> = {};
  const saveTimers: Partial<Record<EditorFileKey, ReturnType<typeof setTimeout>>> = {};
  let fieldApplyTimer: ReturnType<typeof setTimeout> | undefined;

  const srcdoc = computed(() => {
    if (!detail.value) return "";
    const options: BuildSrcdocOptions = { platform: platform.value, checkerClass: isChecker.value ? " se-lab-checker" : "" };
    return buildWidgetSrcdoc(previewSource, previewFieldData, options);
  });

  function toggleChecker(): void {
    isChecker.value = !isChecker.value;
  }

  function addConsoleLine(level: ConsoleLine["level"], message: string): void {
    consoleLines.value.push({
      level,
      message,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    });
    if (consoleLines.value.length > 200) consoleLines.value.shift();
  }

  function clearConsole(): void {
    consoleLines.value = [];
  }

  function syncPreviewFieldDataNow(): void {
    for (const key of Object.keys(previewFieldData)) delete previewFieldData[key];
    Object.assign(previewFieldData, fieldData);
  }

  async function open(id: string, requestedPlatform?: Platform): Promise<void> {
    loading.value = true;
    widgetId.value = id;
    if (requestedPlatform) platform.value = requestedPlatform;
    try {
      const data = await getWidgetDetail(id, platform.value);
      detail.value = data;
      fields.value = normalizeFieldDefinitions(data.fields);
      const storageKey = fieldStorageKey(id, platform.value);
      const loaded = loadFieldData(fields.value, storageKey);
      for (const key of Object.keys(fieldData)) delete fieldData[key];
      Object.assign(fieldData, loaded);
      syncPreviewFieldDataNow();

      editorFiles.html = data.html;
      editorFiles.css = data.css;
      editorFiles.js = data.js;
      editorFiles.fields = data.fieldsSource;
      editorFiles.data = data.dataSource;
      previewSource.html = data.html;
      previewSource.css = data.css;
      previewSource.js = data.js;

      for (const key of Object.keys(fileStatus) as EditorFileKey[]) {
        fileStatus[key] = "synced";
        fileError[key] = "";
      }
    } finally {
      loading.value = false;
    }
  }

  async function switchPlatform(nextPlatform: Platform): Promise<void> {
    if (!widgetId.value || nextPlatform === platform.value) return;
    localStorage.setItem(PREVIEW_PLATFORM_KEY, nextPlatform);
    await open(widgetId.value, nextPlatform);
  }

  function updateField(key: string, value: unknown): void {
    fieldData[key] = value;
    if (widgetId.value) localStorage.setItem(fieldStorageKey(widgetId.value, platform.value), JSON.stringify(fieldData));
    clearTimeout(fieldApplyTimer);
    fieldApplyTimer = setTimeout(syncPreviewFieldDataNow, FIELD_APPLY_DEBOUNCE_MS);
  }

  function setEditorContent(file: EditorFileKey, content: string): void {
    editorFiles[file] = content;
    fileStatus[file] = "dirty";

    clearTimeout(applyTimers[file]);
    applyTimers[file] = setTimeout(() => applyEditorSource(file), APPLY_DEBOUNCE_MS);

    clearTimeout(saveTimers[file]);
    saveTimers[file] = setTimeout(() => void saveFile(file), SAVE_DEBOUNCE_MS);
  }

  function applyEditorSource(file: EditorFileKey): void {
    if (file === "html" || file === "css" || file === "js") {
      previewSource[file] = editorFiles[file];
    }
    if (file === "fields") {
      try {
        const parsed = JSON.parse(editorFiles.fields);
        fields.value = normalizeFieldDefinitions(parsed);
        fileError.fields = "";
      } catch (error) {
        fileStatus.fields = "error";
        fileError.fields = error instanceof Error ? error.message : String(error);
      }
    }
    if (file === "data") {
      try {
        JSON.parse(editorFiles.data || "{}");
        fileError.data = "";
      } catch (error) {
        fileStatus.data = "error";
        fileError.data = error instanceof Error ? error.message : String(error);
      }
    }
  }

  async function saveFile(file: EditorFileKey): Promise<void> {
    if (!widgetId.value || fileStatus[file] === "error") return;
    fileStatus[file] = "saving";
    try {
      await saveWidgetFile(widgetId.value, resolveServerFilename(file), editorFiles[file]);
      fileStatus[file] = "synced";
    } catch (error) {
      fileStatus[file] = "error";
      fileError[file] = error instanceof Error ? error.message : String(error);
    }
  }

  function resolveServerFilename(file: EditorFileKey): string {
    return detail.value ? detail.value.files[file] : file;
  }

  async function flushDirtyFiles(): Promise<void> {
    const dirty = (Object.keys(fileStatus) as EditorFileKey[]).filter((key) => fileStatus[key] === "dirty" || fileStatus[key] === "error");
    for (const file of dirty) {
      clearTimeout(applyTimers[file]);
      clearTimeout(saveTimers[file]);
      applyEditorSource(file);
      await saveFile(file);
    }
  }

  function setActiveFile(file: EditorFileKey): void {
    activeFile.value = file;
  }

  return {
    widgetId,
    detail,
    platform,
    fields,
    fieldData,
    editorFiles,
    fileStatus,
    fileError,
    activeFile,
    consoleLines,
    loading,
    isChecker,
    srcdoc,
    addConsoleLine,
    clearConsole,
    open,
    switchPlatform,
    updateField,
    setEditorContent,
    applyEditorSource,
    saveFile,
    flushDirtyFiles,
    setActiveFile,
    toggleChecker
  };
});
