import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import { getWidgetDetail, saveWidgetFile, type AlertboxTypeCode, type EditorFileKey, type FieldDefinitions, type WidgetDetail } from "../api/widgetDetail";
import { normalizePlatform, type Platform } from "../lib/platformEvents";
import { alertboxFieldStorageKey, fieldStorageKey, loadFieldData, normalizeFieldDefinitions } from "../lib/fieldData";
import { buildWidgetSrcdoc, type BuildSrcdocOptions } from "../lib/widgetSrcdoc";
import { alertboxAlerts, normalizeAlertboxConfig, type AlertboxAlertSettings, type AlertboxAlertType, type AlertboxConfig } from "../lib/alertbox";

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
  // Incrémenté à chaque application de previewFieldData : sert de :key à
  // l'iframe d'aperçu pour la recréer (et renvoyer onWidgetLoad avec les
  // nouvelles valeurs) même quand srcdoc ne change pas, c'est-à-dire quand le
  // widget lit ses réglages via fieldData plutôt que via des {{placeholders}}.
  const previewRevision = ref(0);

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

  const isAlertbox = computed(() => detail.value?.widgetMeta.kind === "alertbox");
  // Réglages natifs par alerte (Follower alert, Subscriber alert…), édités
  // dans le panneau Alertes et enregistrés dans alertbox.json (StreamElements)
  // ou streamlabs/alertbox.json (Streamlabs), selon la plateforme active.
  const alertbox = ref<AlertboxConfig | null>(null);
  const alertboxStatus = ref<FileStatus>("synced");
  let alertboxSaveTimer: ReturnType<typeof setTimeout> | undefined;
  // Code de chaque alerte (comme l'éditeur custom CSS de chaque alerte de
  // l'AlertBox) et valeurs de ses champs. L'alerte active est celle chargée
  // dans editorFiles / fields / fieldData ; son entrée ici n'est remise à jour
  // qu'au changement d'alerte (cf. alertboxSnapshot pour une vue à jour).
  const alertboxCode = ref<Record<AlertboxAlertType, AlertboxTypeCode> | null>(null);
  const alertboxValues = reactive<Partial<Record<AlertboxAlertType, Record<string, unknown>>>>({});
  const activeAlertType = ref<AlertboxAlertType>("follow");
  // Alertes de l'AlertBox de la plateforme active (libellés de la plateforme)
  const alertboxAlertList = computed(() => alertboxAlerts(platform.value));

  function currentFieldStorageKey(): string {
    if (!widgetId.value) return "";
    return isAlertbox.value ? alertboxFieldStorageKey(widgetId.value, activeAlertType.value, platform.value) : fieldStorageKey(widgetId.value, platform.value);
  }

  // Code et valeurs de toutes les alertes, l'alerte active reprenant les
  // tampons de l'éditeur (pour l'export).
  function alertboxSnapshot(): Record<AlertboxAlertType, AlertboxTypeCode & { values: Record<string, unknown> }> | null {
    if (!alertboxCode.value) return null;
    const active = activeAlertType.value;
    return Object.fromEntries(
      (Object.keys(alertboxCode.value) as AlertboxAlertType[]).map((type) => {
        const code = alertboxCode.value![type];
        if (type !== active) return [type, { ...code, values: { ...alertboxValues[type] } }];
        return [
          type,
          { ...code, html: editorFiles.html, css: editorFiles.css, js: editorFiles.js, fields: fields.value, fieldsSource: editorFiles.fields, dataSource: editorFiles.data, values: { ...fieldData } }
        ];
      })
    ) as Record<AlertboxAlertType, AlertboxTypeCode & { values: Record<string, unknown> }>;
  }

  const srcdoc = computed(() => {
    if (!detail.value) return "";
    const options: BuildSrcdocOptions = { platform: platform.value, checkerClass: isChecker.value ? " se-lab-checker" : "" };
    if (alertbox.value && alertboxCode.value) {
      const active = activeAlertType.value;
      const codes = Object.fromEntries(
        (Object.keys(alertboxCode.value) as AlertboxAlertType[]).map((type) => {
          const code = alertboxCode.value![type];
          // Alerte en cours d'édition : tampons débouncés de l'aperçu
          return type === active
            ? [type, { html: previewSource.html, css: previewSource.css, js: previewSource.js, values: { ...previewFieldData } }]
            : [type, { html: code.html, css: code.css, js: code.js, values: alertboxValues[type] || {} }];
        })
      );
      options.alertbox = { config: alertbox.value, codes, platform: platform.value };
    }
    return buildWidgetSrcdoc(previewSource, previewFieldData, options);
  });

  // Charge le code, les champs et les valeurs d'une alerte dans l'éditeur
  function loadAlertTypeIntoEditor(type: AlertboxAlertType): void {
    if (!alertboxCode.value || !detail.value || !widgetId.value) return;
    const code = alertboxCode.value[type];
    activeAlertType.value = type;
    detail.value.files = code.files;
    fields.value = normalizeFieldDefinitions(code.fields);
    const loaded = loadFieldData(fields.value, alertboxFieldStorageKey(widgetId.value, type, platform.value));
    for (const key of Object.keys(fieldData)) delete fieldData[key];
    Object.assign(fieldData, loaded);
    alertboxValues[type] = { ...loaded };
    setEditorBuffers(code);
    syncPreviewFieldDataNow();
  }

  async function selectAlertType(type: AlertboxAlertType): Promise<void> {
    if (!alertboxCode.value || type === activeAlertType.value) return;
    await flushDirtyFiles();
    const previous = activeAlertType.value;
    alertboxCode.value[previous] = {
      ...alertboxCode.value[previous],
      html: editorFiles.html,
      css: editorFiles.css,
      js: editorFiles.js,
      fields: fields.value,
      fieldsSource: editorFiles.fields,
      dataSource: editorFiles.data
    };
    alertboxValues[previous] = { ...fieldData };
    loadAlertTypeIntoEditor(type);
  }

  function setEditorBuffers(source: { html: string; css: string; js: string; fieldsSource: string; dataSource: string }): void {
    editorFiles.html = source.html;
    editorFiles.css = source.css;
    editorFiles.js = source.js;
    editorFiles.fields = source.fieldsSource;
    editorFiles.data = source.dataSource;
    previewSource.html = source.html;
    previewSource.css = source.css;
    previewSource.js = source.js;
    for (const key of Object.keys(fileStatus) as EditorFileKey[]) {
      fileStatus[key] = "synced";
      fileError[key] = "";
    }
  }

  function updateAlertbox(type: AlertboxAlertType, patch: Partial<AlertboxAlertSettings>): void {
    if (!alertbox.value) return;
    alertbox.value = { alerts: { ...alertbox.value.alerts, [type]: { ...alertbox.value.alerts[type], ...patch } } };
    alertboxStatus.value = "dirty";
    clearTimeout(alertboxSaveTimer);
    alertboxSaveTimer = setTimeout(() => void saveAlertbox(), SAVE_DEBOUNCE_MS);
  }

  async function saveAlertbox(): Promise<void> {
    if (!widgetId.value || !alertbox.value) return;
    alertboxStatus.value = "saving";
    try {
      const configFile = platform.value === "streamlabs" ? "streamlabs/alertbox.json" : "alertbox.json";
      await saveWidgetFile(widgetId.value, configFile, `${JSON.stringify(alertbox.value, null, 2)}\n`);
      alertboxStatus.value = "synced";
    } catch {
      alertboxStatus.value = "error";
    }
  }

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
    previewRevision.value++;
  }

  async function open(id: string, requestedPlatform?: Platform): Promise<void> {
    loading.value = true;
    widgetId.value = id;
    clearTimeout(alertboxSaveTimer);
    try {
      // Plateforme préférée (mémorisée), sauf si le serveur en impose une
      // (AlertBox = StreamElements uniquement) : on suit sa réponse, sans
      // toucher à la préférence pour les widgets suivants.
      const data = await getWidgetDetail(id, requestedPlatform ?? normalizePlatform(localStorage.getItem(PREVIEW_PLATFORM_KEY)));
      platform.value = data.platform;
      detail.value = data;
      alertboxStatus.value = "synced";

      if (data.widgetMeta.kind === "alertbox" && data.alertboxCode) {
        alertbox.value = normalizeAlertboxConfig(data.alertbox, data.platform);
        alertboxCode.value = data.alertboxCode;
        for (const key of Object.keys(alertboxValues) as AlertboxAlertType[]) delete alertboxValues[key];
        for (const [type, code] of Object.entries(data.alertboxCode) as [AlertboxAlertType, AlertboxTypeCode][]) {
          alertboxValues[type] = loadFieldData(normalizeFieldDefinitions(code.fields), alertboxFieldStorageKey(id, type, data.platform));
        }
        loadAlertTypeIntoEditor(alertboxAlerts(data.platform)[0].type);
        return;
      }

      alertbox.value = null;
      alertboxCode.value = null;
      fields.value = normalizeFieldDefinitions(data.fields);
      const loaded = loadFieldData(fields.value, fieldStorageKey(id, platform.value));
      for (const key of Object.keys(fieldData)) delete fieldData[key];
      Object.assign(fieldData, loaded);
      syncPreviewFieldDataNow();
      setEditorBuffers(data);
    } finally {
      loading.value = false;
    }
  }

  async function switchPlatform(nextPlatform: Platform): Promise<void> {
    if (!widgetId.value || nextPlatform === platform.value) return;
    // Modifications en attente de la plateforme quittée (code, réglages natifs)
    await flushDirtyFiles();
    if (alertboxStatus.value === "dirty") {
      clearTimeout(alertboxSaveTimer);
      await saveAlertbox();
    }
    localStorage.setItem(PREVIEW_PLATFORM_KEY, nextPlatform);
    await open(widgetId.value, nextPlatform);
  }

  function updateField(key: string, value: unknown): void {
    fieldData[key] = value;
    if (widgetId.value) localStorage.setItem(currentFieldStorageKey(), JSON.stringify(fieldData));
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
    previewRevision,
    isAlertbox,
    alertbox,
    alertboxStatus,
    updateAlertbox,
    alertboxCode,
    alertboxAlertList,
    activeAlertType,
    selectAlertType,
    alertboxSnapshot,
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
